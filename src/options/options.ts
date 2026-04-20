import type {
	ColorBlindTheme,
	CustomSendToTargetInput,
	DefaultExportType,
	DownloadMode,
	ExtensionOptions,
	SendToCustomTarget,
	SpecialTheme,
	SnipSnipAgentBridgeStateApi,
	SnipSnipLibraryStateApi,
	SnipSnipOptionsStateApi,
	SnipSnipTemplateUtilsApi,
} from '@/lib/types/index.ts';
import { getItemsBag, setItemsBag, storage } from '@/shared/storage.ts';
import { browser } from 'wxt/browser';

type OptionsState =
	& Omit<Partial<ExtensionOptions>, 'sendToCustomTargets' | 'defaultSendToTarget' | 'siteRules' | 'tableFormatting'>
	& Record<string, unknown>
	& {
		sendToCustomTargets?: CustomSendToTarget[];
		defaultSendToTarget?: string;
		sendToMaxUrlLength?: number;
		siteRules?: SiteRule[];
		tableFormatting?: Partial<ExtensionOptions['tableFormatting']>;
		mdClipsFolder?: string | null;
		obsidianFolder?: string;
		popupTheme?: string;
		specialTheme?: string;
		colorBlindTheme?: string;
		popupAccent?: string;
		compactMode?: boolean;
		showThemeToggleInPopup?: boolean;
		showUserGuideIcon?: boolean;
		contextMenus?: boolean;
		batchProcessingEnabled?: boolean;
		obsidianIntegration?: boolean;
		agentBridgeEnabled?: boolean;
		libraryEnabled?: boolean;
		autoSaveOnPopupOpen?: boolean;
		itemsToKeep?: number;
		defaultExportType?: string;
		defaultSendToTargetCustomOptions?: string;
	};

type SiteRulesApi = NonNullable<typeof globalThis.snipSnipSiteRules> & {
	collectOverrideKeys?: (overrides?: SiteRuleOverride) => string[];
};
type TableFormattingState = NonNullable<OptionsState['tableFormatting']>;
type SearchIndexEntry = {
	card: HTMLElement;
	section: HTMLElement;
};
type SearchTokenMatch = {
	token: string;
	fieldSource: string;
};
type SearchResultEntry = SearchIndexEntry & {
	matches: boolean;
	tokenMatches: SearchTokenMatch[];
};
type OptionsSearchApi = {
	buildSearchIndex(rootNode: Document): SearchIndexEntry[];
	normalizeSearchText(value: unknown): string;
	searchSettings(index: SearchIndexEntry[], query: string): { results: SearchResultEntry[] };
};
type ToastElement = HTMLElement & { _hideTimeout?: ReturnType<typeof setTimeout> };
type SiteRuleBooleanKey = 'includeTemplate' | 'downloadImages';
type SiteRuleEnumKey = 'imageStyle' | 'imageRefStyle';
type SiteRuleTextKey = 'frontmatter' | 'backmatter' | 'title' | 'imagePrefix' | 'mdClipsFolder';
type SiteRuleTableKey = keyof NonNullable<SiteRuleOverride['tableFormatting']>;

type ElementConstructor<T extends Element> = abstract new(...args: never[]) => T;

const createMenus = Reflect.get(globalThis, 'createMenus');
const defaultOptions: OptionsState = globalThis.defaultOptions ? { ...globalThis.defaultOptions } : {};
const _moment = globalThis.moment;
const chromeApi = Reflect.get(globalThis, 'chrome');

interface LibrarySettings {
	enabled: boolean;
	autoSaveOnPopupOpen: boolean;
	itemsToKeep: number;
}

interface AgentBridgeSettings {
	enabled: boolean;
}

interface AgentBridgeStatus {
	enabled: boolean;
	permissionGranted: boolean;
	connecting: boolean;
	connected: boolean;
	hostInstalled: boolean;
	browser: string;
	hostVersion: string;
	lastError: string;
	updatedAt: string;
}

interface SiteRuleEditorState {
	mode: 'create' | 'edit';
	ruleId: string | null;
}

interface SendToUrlValidation {
	valid: boolean;
	normalizedValue: string;
	error: string;
}

interface CustomSendToTarget {
	id: SendToCustomTarget['id'];
	name: string;
	urlTemplate: string;
}

interface SiteRuleOverride {
	includeTemplate?: boolean;
	downloadImages?: boolean;
	frontmatter?: string;
	backmatter?: string;
	title?: string;
	imagePrefix?: string;
	mdClipsFolder?: string | null;
	imageStyle?: string;
	imageRefStyle?: string;
	tableFormatting?: {
		stripLinks?: boolean;
		stripFormatting?: boolean;
		prettyPrint?: boolean;
		centerText?: boolean;
	};
}

interface SiteRule {
	id: string;
	name: string;
	enabled: boolean;
	pattern: string;
	overrides: SiteRuleOverride;
}

/** @type {Object} */
let options: OptionsState = { ...defaultOptions };
/** @type {LibrarySettings} */
let librarySettings: LibrarySettings = {
	enabled: true,
	autoSaveOnPopupOpen: true,
	itemsToKeep: 10,
};
/** @type {AgentBridgeSettings} */
let agentBridgeSettings: AgentBridgeSettings = {
	enabled: false,
};
/** @type {AgentBridgeStatus} */
let agentBridgeStatus: AgentBridgeStatus = {
	enabled: false,
	permissionGranted: false,
	connecting: false,
	connected: false,
	hostInstalled: false,
	browser: '',
	hostVersion: '',
	lastError: '',
	updatedAt: '',
};
let agentBridgeInstallCommand = 'snipsnip install-host';
let keyupTimeout: ReturnType<typeof setTimeout> | null = null;
let templatePreviewListenersBound = false;
const SPECIAL_THEME_CLASS_NAMES = [
	'special-theme-claude',
	'special-theme-perplexity',
	'special-theme-openai',
	'special-theme-atla',
	'special-theme-ben10',
	'special-theme-colorblind',
];
const COLORBLIND_VARIANT_CLASS_NAMES = [
	'colorblind-theme-deuteranopia',
	'colorblind-theme-protanopia',
	'colorblind-theme-tritanopia',
];
const ACCENT_CLASS_NAMES = ['accent-sage', 'accent-ocean', 'accent-slate', 'accent-rose', 'accent-amber'];
const POPUP_THEME_CACHE_KEY = 'snipsnip-popup-theme-cache-v1';
const DEFAULT_SEND_TO_TARGET = 'chatgpt';
const DEFAULT_SEND_TO_MAX_URL_LENGTH = 3600;
const SITE_RULE_BOOLEAN_FIELD_IDS: Record<SiteRuleBooleanKey, string> = {
	includeTemplate: 'siteRuleIncludeTemplate',
	downloadImages: 'siteRuleDownloadImages',
};
const SITE_RULE_ENUM_FIELD_IDS: Record<SiteRuleEnumKey, string> = {
	imageStyle: 'siteRuleImageStyle',
	imageRefStyle: 'siteRuleImageRefStyle',
};
const SITE_RULE_TEXT_FIELD_IDS: Record<SiteRuleTextKey, { toggleId: string; inputId: string }> = {
	frontmatter: { toggleId: 'siteRuleFrontmatterEnabled', inputId: 'siteRuleFrontmatter' },
	backmatter: { toggleId: 'siteRuleBackmatterEnabled', inputId: 'siteRuleBackmatter' },
	title: { toggleId: 'siteRuleTitleEnabled', inputId: 'siteRuleTitle' },
	imagePrefix: { toggleId: 'siteRuleImagePrefixEnabled', inputId: 'siteRuleImagePrefix' },
	mdClipsFolder: { toggleId: 'siteRuleMdClipsFolderEnabled', inputId: 'siteRuleMdClipsFolder' },
};
const SITE_RULE_TABLE_FIELD_IDS: Record<SiteRuleTableKey, string> = {
	stripLinks: 'siteRuleTableStripLinks',
	stripFormatting: 'siteRuleTableStripFormatting',
	prettyPrint: 'siteRuleTablePrettyPrint',
	centerText: 'siteRuleTableCenterText',
};
const SITE_RULE_OVERRIDE_LABELS = {
	includeTemplate: 'Template',
	downloadImages: 'Download Images',
	frontmatter: 'Frontmatter',
	backmatter: 'Backmatter',
	title: 'Title',
	imagePrefix: 'Image Prefix',
	mdClipsFolder: 'Downloads Folder',
	imageStyle: 'Image Style',
	imageRefStyle: 'Image Refs',
	'tableFormatting.stripLinks': 'Strip Links',
	'tableFormatting.stripFormatting': 'Strip Formatting',
	'tableFormatting.prettyPrint': 'Pretty Print',
	'tableFormatting.centerText': 'Center Text',
};
/** @type {SiteRuleEditorState} */
let siteRuleEditorState: SiteRuleEditorState = {
	mode: 'create',
	ruleId: null,
};

function objectKeys<T extends object>(value: T): Array<Extract<keyof T, string>> {
	return Object.keys(value) as Array<Extract<keyof T, string>>;
}

function getElementByIdOfType<T extends Element>(id: string, ctor: ElementConstructor<T>): T | null {
	const element = document.getElementById(id);
	return element instanceof ctor ? element : null;
}

function queryElementOfType<T extends Element>(
	selector: string,
	ctor: ElementConstructor<T>,
	root: ParentNode = document,
): T | null {
	const element = root.querySelector(selector);
	return element instanceof ctor ? element : null;
}

function queryAllOfType<T extends Element>(
	selector: string,
	ctor: ElementConstructor<T>,
	root: ParentNode = document,
): T[] {
	return Array.from(root.querySelectorAll(selector)).filter((element): element is T => element instanceof ctor);
}

function getInputById(id: string): HTMLInputElement | null {
	return getElementByIdOfType(id, HTMLInputElement);
}

function getTextAreaById(id: string): HTMLTextAreaElement | null {
	return getElementByIdOfType(id, HTMLTextAreaElement);
}

function getButtonById(id: string): HTMLButtonElement | null {
	return getElementByIdOfType(id, HTMLButtonElement);
}

function getHtmlElementById(id: string): HTMLElement | null {
	return getElementByIdOfType(id, HTMLElement);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function normalizeSpecialTheme(value: unknown): SpecialTheme {
	const normalized = String(value || 'none');
	return ['none', 'claude', 'perplexity', 'openai', 'atla', 'ben10'].includes(normalized)
		? normalized as SpecialTheme
		: 'none';
}

function getTableFormattingState(value: unknown): TableFormattingState {
	if (!isRecord(value)) {
		return {};
	}

	return {
		stripLinks: value.stripLinks === true,
		stripFormatting: value.stripFormatting === true,
		prettyPrint: value.prettyPrint === true,
		centerText: value.centerText === true,
	};
}

function getInputValueByName(name: string): string {
	return queryElementOfType(`[name='${name}']`, HTMLInputElement)?.value ?? '';
}

function getTextAreaValueByName(name: string): string {
	return queryElementOfType(`[name='${name}']`, HTMLTextAreaElement)?.value ?? '';
}

function getCheckedByName(name: string): boolean {
	return queryElementOfType(`[name='${name}']`, HTMLInputElement)?.checked === true;
}

function _getOptionsSearchApi(): OptionsSearchApi | null {
	const candidate = Reflect.get(globalThis, 'snipSnipOptionsSearch');
	if (
		candidate
		&& typeof candidate === 'object'
		&& typeof Reflect.get(candidate, 'buildSearchIndex') === 'function'
		&& typeof Reflect.get(candidate, 'normalizeSearchText') === 'function'
		&& typeof Reflect.get(candidate, 'searchSettings') === 'function'
	) {
		return candidate as OptionsSearchApi;
	}

	return null;
}

function getOptionsStateApi(): SnipSnipOptionsStateApi | null {
	return globalThis.snipSnipOptionsState || null;
}

function getLibraryStateApi(): SnipSnipLibraryStateApi | null {
	return globalThis.snipSnipLibraryState || null;
}

function getAgentBridgeStateApi(): SnipSnipAgentBridgeStateApi | null {
	return globalThis.snipSnipAgentBridgeState || null;
}

function getSiteRulesApi(): SiteRulesApi | null {
	return globalThis.snipSnipSiteRules || null;
}

function getTemplateUtils(): SnipSnipTemplateUtilsApi | null {
	return globalThis.snipSnipTemplateUtils || null;
}

function normalizeSiteRulesState(rules: unknown): SiteRule[] {
	const siteRulesApi = getSiteRulesApi();
	if (siteRulesApi?.normalizeSiteRules) {
		return siteRulesApi.normalizeSiteRules(rules) as SiteRule[];
	}

	return Array.isArray(rules) ? rules.slice() : [];
}

function normalizeSiteRuleOverridesState(overrides: unknown): SiteRuleOverride {
	const siteRulesApi = getSiteRulesApi();
	if (siteRulesApi?.normalizeSiteRuleOverrides) {
		return siteRulesApi.normalizeSiteRuleOverrides(overrides);
	}

	return overrides && typeof overrides === 'object' ? { ...overrides } : {};
}

function validateSiteRulePatternState(pattern: unknown): { valid: boolean; error: string; normalizedPattern: string } {
	const siteRulesApi = getSiteRulesApi();
	if (siteRulesApi?.validateSiteRulePattern) {
		return siteRulesApi.validateSiteRulePattern(pattern);
	}

	const normalizedPattern = String(pattern || '').trim();
	return {
		valid: Boolean(normalizedPattern),
		error: normalizedPattern ? '' : 'Pattern is required',
		normalizedPattern,
	};
}

/**
 * @returns {string}
 */
function buildSiteRuleIdState(): string {
	return `site-rule-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function escapeHtml(value: string): string {
	return String(value || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * @returns {string}
 */
function buildCustomSendToTargetId(): string {
	return `custom-target-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function getSendToUrlValidationState(value: unknown): SendToUrlValidation {
	const optionsStateApi = getOptionsStateApi();
	if (optionsStateApi?.validateSendToUrlTemplate) {
		return optionsStateApi.validateSendToUrlTemplate(typeof value === 'string' ? value : undefined);
	}

	const normalizedValue = String(value || '').trim();
	if (!normalizedValue) {
		return { valid: false, normalizedValue: '', error: 'URL template is required' };
	}

	const matches = normalizedValue.match(/\{prompt\}/g) || [];
	if (matches.length !== 1) {
		return { valid: false, normalizedValue, error: 'URL template must contain exactly one {prompt} placeholder' };
	}

	const queryStartIndex = normalizedValue.indexOf('?');
	const hashStartIndex = normalizedValue.indexOf('#');
	const promptIndex = normalizedValue.indexOf('{prompt}');
	const queryEndIndex = hashStartIndex === -1 ? normalizedValue.length : hashStartIndex;
	if (queryStartIndex === -1 || promptIndex < queryStartIndex || promptIndex >= queryEndIndex) {
		return { valid: false, normalizedValue, error: '{prompt} must appear in the query portion of the URL' };
	}

	try {
		const parsedUrl = new URL(normalizedValue.replace('{prompt}', '__SNIPSNIP_PROMPT__'));
		if (parsedUrl.protocol !== 'https:') {
			return { valid: false, normalizedValue, error: 'URL template must start with https://' };
		}
	} catch {
		return { valid: false, normalizedValue, error: 'URL template must be a valid HTTPS URL' };
	}

	return { valid: true, normalizedValue, error: '' };
}

function normalizeCustomSendToTargetsState(targets: unknown): CustomSendToTarget[] {
	const optionsStateApi = getOptionsStateApi();
	if (optionsStateApi?.normalizeCustomSendToTargets) {
		return optionsStateApi.normalizeCustomSendToTargets(targets as CustomSendToTargetInput[]) as CustomSendToTarget[];
	}

	if (!Array.isArray(targets)) {
		return [];
	}

	const seenIds = new Set();
	return targets.reduce((normalizedTargets, target, index) => {
		if (!target || typeof target !== 'object') {
			return normalizedTargets;
		}

		const name = String(target.name || '').trim();
		const validation = getSendToUrlValidationState(target.urlTemplate ?? target.url);
		if (!name || !validation.valid) {
			return normalizedTargets;
		}

		const id = String(target.id || '').trim() || `custom-target-${index + 1}`;
		if (seenIds.has(id)) {
			return normalizedTargets;
		}

		seenIds.add(id);
		normalizedTargets.push({
			id,
			name,
			urlTemplate: validation.normalizedValue,
		});
		return normalizedTargets;
	}, []);
}

function normalizeDefaultSendToTargetState(
	value: unknown,
	customTargets: CustomSendToTarget[] = normalizeCustomSendToTargetsState(options?.sendToCustomTargets),
): string {
	const optionsStateApi = getOptionsStateApi();
	if (optionsStateApi?.normalizeDefaultSendToTarget) {
		const normalizedCustomTargets = customTargets.map((target) => ({
			...target,
			id: target.id.startsWith('custom-')
				? (target.id as `custom-${string}`)
				: (`custom-${target.id}` as `custom-${string}`),
		}));
		return optionsStateApi.normalizeDefaultSendToTarget(
			typeof value === 'string' ? value : undefined,
			normalizedCustomTargets,
			DEFAULT_SEND_TO_TARGET,
		);
	}

	const normalizedValue = String(value || '').trim();
	if (normalizedValue === 'chatgpt' || normalizedValue === 'claude' || normalizedValue === 'perplexity') {
		return normalizedValue;
	}

	return customTargets.some((target) => target.id === normalizedValue)
		? normalizedValue
		: DEFAULT_SEND_TO_TARGET;
}

function normalizeSendToMaxUrlLengthState(
	value: unknown,
	fallbackValue: number = defaultOptions?.sendToMaxUrlLength ?? DEFAULT_SEND_TO_MAX_URL_LENGTH,
): number {
	const optionsStateApi = getOptionsStateApi();
	if (optionsStateApi?.normalizeSendToMaxUrlLength) {
		return optionsStateApi.normalizeSendToMaxUrlLength(value, fallbackValue);
	}

	const normalizedFallback = Number.isFinite(Number(fallbackValue)) && Number(fallbackValue) > 0
		? Math.floor(Number(fallbackValue))
		: DEFAULT_SEND_TO_MAX_URL_LENGTH;
	const parsedValue = Number.parseInt(String(value ?? '').trim(), 10);
	return Number.isFinite(parsedValue) && parsedValue > 0
		? parsedValue
		: normalizedFallback;
}

/**
 * @returns {CustomSendToTarget[]}
 */
function getNormalizedSendToTargets(): CustomSendToTarget[] {
	const targets = normalizeCustomSendToTargetsState(options?.sendToCustomTargets);
	options.sendToCustomTargets = targets;
	options.defaultSendToTarget = normalizeDefaultSendToTargetState(options?.defaultSendToTarget, targets);
	return targets;
}

function renderDefaultSendToTargetOptions() {
	const customContainer = document.getElementById('defaultSendToTargetCustomOptions');
	if (!customContainer) {
		return;
	}

	const defaultTarget = normalizeDefaultSendToTargetState(options?.defaultSendToTarget, getNormalizedSendToTargets());
	const builtInInputs = {
		chatgpt: getInputById('send-to-target-chatgpt'),
		claude: getInputById('send-to-target-claude'),
		perplexity: getInputById('send-to-target-perplexity'),
	};
	Object.entries(builtInInputs).forEach(([targetId, input]) => {
		if (input) {
			input.checked = defaultTarget === targetId;
		}
	});

	const targets = getNormalizedSendToTargets();
	customContainer.innerHTML = '';
	targets.forEach((target) => {
		const radioPill = document.createElement('div');
		radioPill.className = 'radio-pill';

		const input = document.createElement('input');
		input.type = 'radio';
		input.name = 'defaultSendToTarget';
		input.id = `send-to-target-${target.id}`;
		input.value = target.id;
		input.checked = defaultTarget === target.id;

		const label = document.createElement('label');
		label.setAttribute('for', input.id);
		label.textContent = target.name;

		radioPill.appendChild(input);
		radioPill.appendChild(label);
		customContainer.appendChild(radioPill);
	});
}

function renderAssistantTargetsList() {
	const list = document.getElementById('assistantTargetsList');
	if (!list) {
		return;
	}

	const targets = getNormalizedSendToTargets();
	list.innerHTML = '';
	if (targets.length === 0) {
		const emptyState = document.createElement('p');
		emptyState.className = 'assistant-targets-empty';
		emptyState.textContent = 'No custom assistant targets yet. ChatGPT, Claude, and Perplexity are always available.';
		list.appendChild(emptyState);
		return;
	}

	targets.forEach((target) => {
		const item = document.createElement('article');
		item.className = 'assistant-target-item';

		const body = document.createElement('div');
		body.className = 'assistant-target-item__body';

		const name = document.createElement('h4');
		name.className = 'assistant-target-item__name';
		name.textContent = target.name;

		const meta = document.createElement('code');
		meta.className = 'assistant-target-item__meta';
		meta.textContent = target.urlTemplate;
		meta.title = target.urlTemplate;

		body.appendChild(name);
		body.appendChild(meta);

		const removeButton = document.createElement('button');
		removeButton.type = 'button';
		removeButton.className = 'btn btn-secondary btn-sm assistant-target-item__remove';
		removeButton.dataset.targetId = target.id;
		removeButton.textContent = 'Remove';
		removeButton.setAttribute('aria-label', `Remove ${target.name}`);

		item.appendChild(body);
		item.appendChild(removeButton);
		list.appendChild(item);
	});
}

function handleDefaultSendToTargetChoice(event: Event) {
	const input = event.target;
	if (!(input instanceof HTMLInputElement)) {
		return;
	}
	if (!input || input.name !== 'defaultSendToTarget') {
		return;
	}

	options.defaultSendToTarget = normalizeDefaultSendToTargetState(input.value, getNormalizedSendToTargets());
	renderDefaultSendToTargetOptions();
	save();
}

async function handleAddCustomSendToTarget() {
	const nameInput = getInputById('customSendToName');
	const urlInput = getInputById('customSendToUrl');
	const name = String(nameInput?.value || '').trim();
	const validation = getSendToUrlValidationState(urlInput?.value || '');

	if (!name) {
		showToast('Please enter a target name', 'error');
		nameInput?.focus();
		return;
	}

	if (!validation.valid) {
		showToast(validation.error || 'Please enter a valid URL template', 'error');
		urlInput?.focus();
		return;
	}

	const nextTargets = [
		...getNormalizedSendToTargets(),
		{
			id: buildCustomSendToTargetId(),
			name,
			urlTemplate: validation.normalizedValue,
		},
	];

	options.sendToCustomTargets = normalizeCustomSendToTargetsState(nextTargets);
	options.defaultSendToTarget = normalizeDefaultSendToTargetState(
		options.defaultSendToTarget,
		options.sendToCustomTargets,
	);
	renderDefaultSendToTargetOptions();
	renderAssistantTargetsList();

	if (nameInput) {
		nameInput.value = '';
	}
	if (urlInput) {
		urlInput.value = '';
	}

	save({ message: `Added "${name}"`, type: 'success' });
	nameInput?.focus();
}

function removeCustomSendToTarget(targetId: string) {
	const currentTargets = getNormalizedSendToTargets();
	const removedTarget = currentTargets.find((target) => target.id === targetId);
	if (!removedTarget) {
		return;
	}

	options.sendToCustomTargets = currentTargets.filter((target) => target.id !== targetId);
	options.defaultSendToTarget = normalizeDefaultSendToTargetState(
		options.defaultSendToTarget === targetId ? DEFAULT_SEND_TO_TARGET : options.defaultSendToTarget,
		options.sendToCustomTargets,
	);

	renderDefaultSendToTargetOptions();
	renderAssistantTargetsList();
	save({ message: `Removed "${removedTarget.name}"`, type: 'success' });
}

function initSendToControls() {
	document.getElementById('defaultSendToTargetOptions')?.addEventListener('change', handleDefaultSendToTargetChoice);
	document.getElementById('addSendToCustomTarget')?.addEventListener('click', () => {
		handleAddCustomSendToTarget().catch((error) => {
			console.error('Failed to add custom assistant target:', error);
			showToast('Failed to add assistant target', 'error');
		});
	});
	document.getElementById('assistantTargetsList')?.addEventListener('click', (event) => {
		const removeButton = event.target instanceof Element ? event.target.closest('[data-target-id]') : null;
		if (!removeButton) {
			return;
		}
		const targetId = removeButton instanceof HTMLElement ? removeButton.dataset.targetId : undefined;
		if (!targetId) {
			return;
		}
		removeCustomSendToTarget(targetId);
	});

	['customSendToName', 'customSendToUrl'].forEach((inputId) => {
		document.getElementById(inputId)?.addEventListener('keydown', (event) => {
			if (event.key !== 'Enter') {
				return;
			}
			event.preventDefault();
			handleAddCustomSendToTarget().catch((error) => {
				console.error('Failed to add custom assistant target:', error);
				showToast('Failed to add assistant target', 'error');
			});
		});
	});
}

/**
 * @returns {SiteRule[]}
 */
function getSiteRulesList(): SiteRule[] {
	return normalizeSiteRulesState(options?.siteRules);
}

function setSiteRules(nextRules: unknown): void {
	options.siteRules = normalizeSiteRulesState(nextRules);
}

/**
 * @param {string} ruleId
 * @returns {SiteRule|null}
 */
function findSiteRule(ruleId: string): SiteRule | null {
	return getSiteRulesList().find((rule) => rule.id === ruleId) || null;
}

/**
 * @param {string} id
 * @returns {boolean|undefined}
 */
function readTriStateBoolean(id: string): boolean | undefined {
	const value = getInputById(id)?.value || 'inherit';
	if (value === 'true') return true;
	if (value === 'false') return false;
	return undefined;
}

/**
 * @param {string} id
 * @param {boolean|undefined} value
 * @returns {void}
 */
function setTriStateBoolean(id: string, value: boolean | undefined): void {
	const input = getInputById(id);
	if (!input) return;
	input.value = value === true ? 'true' : value === false ? 'false' : 'inherit';
}

function setTextOverrideControl(toggleId: string, inputId: string, value: string | null | undefined): void {
	const toggle = getInputById(toggleId);
	const input = getInputById(inputId) || getTextAreaById(inputId);
	const enabled = value !== undefined;
	if (toggle) {
		toggle.checked = enabled;
	}
	if (input) {
		input.value = enabled ? String(value) : '';
		input.disabled = !enabled;
	}
}

/**
 * @returns {void}
 */
function refreshSiteRuleTextOverrideStates(): void {
	Object.values(SITE_RULE_TEXT_FIELD_IDS).forEach(({ toggleId, inputId }) => {
		const toggle = getInputById(toggleId);
		const input = getInputById(inputId) || getTextAreaById(inputId);
		if (!toggle || !input) return;
		input.disabled = !toggle.checked;
		input.closest('.site-rule-text-override')?.classList.toggle('is-disabled', !toggle.checked);
	});
}

/**
 * @returns {void}
 */
function clearSiteRuleEditorFeedback(): void {
	const feedback = document.getElementById('siteRulePatternFeedback');
	const patternInput = document.getElementById('siteRulePattern');
	if (feedback) {
		feedback.textContent = '';
		feedback.classList.remove('is-error', 'is-success');
	}
	if (patternInput) {
		patternInput.classList.remove('is-invalid');
	}
}

/**
 * @returns {void}
 */
function resetSiteRuleEditor(): void {
	siteRuleEditorState = { mode: 'create', ruleId: null };
	const editorTitle = document.getElementById('siteRuleEditorTitle');
	const siteRuleName = getInputById('siteRuleName');
	const siteRulePattern = getInputById('siteRulePattern');
	const siteRuleEnabled = getInputById('siteRuleEnabled');
	if (editorTitle) editorTitle.textContent = 'Add Site Rule';
	if (siteRuleName) siteRuleName.value = '';
	if (siteRulePattern) siteRulePattern.value = '';
	if (siteRuleEnabled) siteRuleEnabled.checked = true;

	Object.values(SITE_RULE_BOOLEAN_FIELD_IDS).forEach((id) => {
		setTriStateBoolean(id, undefined);
	});
	Object.values(SITE_RULE_ENUM_FIELD_IDS).forEach((id) => {
		const input = getInputById(id);
		if (input) input.value = 'inherit';
	});
	Object.values(SITE_RULE_TABLE_FIELD_IDS).forEach((id) => {
		setTriStateBoolean(id, undefined);
	});
	Object.values(SITE_RULE_TEXT_FIELD_IDS).forEach(({ toggleId, inputId }) => {
		setTextOverrideControl(toggleId, inputId, undefined);
	});

	clearSiteRuleEditorFeedback();
	refreshSiteRuleTextOverrideStates();
}

/**
 * @param {string|null} [ruleId]
 * @returns {void}
 */
function openSiteRuleEditor(ruleId: string | null = null): void {
	resetSiteRuleEditor();
	const editor = document.getElementById('siteRuleEditor');
	if (!editor) {
		return;
	}

	if (ruleId) {
		const rule = findSiteRule(ruleId);
		if (rule) {
			siteRuleEditorState = { mode: 'edit', ruleId };
			const editorTitle = document.getElementById('siteRuleEditorTitle');
			const siteRuleName = getInputById('siteRuleName');
			const siteRulePattern = getInputById('siteRulePattern');
			const siteRuleEnabled = getInputById('siteRuleEnabled');
			if (editorTitle) editorTitle.textContent = 'Edit Site Rule';
			if (siteRuleName) siteRuleName.value = rule.name || '';
			if (siteRulePattern) siteRulePattern.value = rule.pattern || '';
			if (siteRuleEnabled) siteRuleEnabled.checked = rule.enabled !== false;

			objectKeys(SITE_RULE_BOOLEAN_FIELD_IDS).forEach((key) => {
				setTriStateBoolean(SITE_RULE_BOOLEAN_FIELD_IDS[key], rule.overrides?.[key]);
			});
			objectKeys(SITE_RULE_ENUM_FIELD_IDS).forEach((key) => {
				const input = getInputById(SITE_RULE_ENUM_FIELD_IDS[key]);
				if (input) {
					input.value = rule.overrides?.[key] || 'inherit';
				}
			});
			objectKeys(SITE_RULE_TABLE_FIELD_IDS).forEach((key) => {
				setTriStateBoolean(SITE_RULE_TABLE_FIELD_IDS[key], rule.overrides?.tableFormatting?.[key]);
			});
			objectKeys(SITE_RULE_TEXT_FIELD_IDS).forEach((key) => {
				const config = SITE_RULE_TEXT_FIELD_IDS[key];
				setTextOverrideControl(config.toggleId, config.inputId, rule.overrides?.[key]);
			});
		}
	}

	editor.hidden = false;
	refreshSiteRuleTextOverrideStates();
	document.getElementById('siteRuleName')?.focus();
}

/**
 * @returns {void}
 */
function closeSiteRuleEditor(): void {
	document.getElementById('siteRuleEditor')?.setAttribute('hidden', '');
	const editor = document.getElementById('siteRuleEditor');
	if (editor) {
		editor.hidden = true;
	}
	resetSiteRuleEditor();
}

/**
 * @returns {SiteRuleOverride}
 */
function buildSiteRuleOverridesFromEditor(): SiteRuleOverride {
	const overrides: SiteRuleOverride = {};

	objectKeys(SITE_RULE_BOOLEAN_FIELD_IDS).forEach((key) => {
		const value = readTriStateBoolean(SITE_RULE_BOOLEAN_FIELD_IDS[key]);
		if (value !== undefined) {
			overrides[key] = value;
		}
	});

	objectKeys(SITE_RULE_ENUM_FIELD_IDS).forEach((key) => {
		const value = getInputById(SITE_RULE_ENUM_FIELD_IDS[key])?.value || 'inherit';
		if (value !== 'inherit') {
			overrides[key] = value;
		}
	});

	objectKeys(SITE_RULE_TEXT_FIELD_IDS).forEach((key) => {
		const { toggleId, inputId } = SITE_RULE_TEXT_FIELD_IDS[key];
		const toggle = getInputById(toggleId);
		const input = getInputById(inputId) || getTextAreaById(inputId);
		if (toggle?.checked) {
			overrides[key] = input?.value ?? '';
		}
	});

	const tableFormatting: NonNullable<SiteRuleOverride['tableFormatting']> = {};
	objectKeys(SITE_RULE_TABLE_FIELD_IDS).forEach((key) => {
		const value = readTriStateBoolean(SITE_RULE_TABLE_FIELD_IDS[key]);
		if (value !== undefined) {
			tableFormatting[key] = value;
		}
	});
	if (Object.keys(tableFormatting).length > 0) {
		overrides.tableFormatting = tableFormatting;
	}

	return normalizeSiteRuleOverridesState(overrides);
}

/**
 * @param {SiteRule} rule
 * @returns {string[]}
 */
function getSiteRuleOverrideLabels(rule: SiteRule): string[] {
	const siteRulesApi = getSiteRulesApi();
	const overrideKeys = siteRulesApi?.collectOverrideKeys
		? siteRulesApi.collectOverrideKeys(rule?.overrides)
		: [];

	return overrideKeys.map((key) => {
		const label = Reflect.get(SITE_RULE_OVERRIDE_LABELS, key);
		return typeof label === 'string' ? label : key;
	});
}

/**
 * @param {SiteRule[]} rules
 * @returns {void}
 */
function updateSiteRulesSummary(rules: SiteRule[]): void {
	const summary = document.getElementById('siteRulesSummary');
	if (!summary) {
		return;
	}

	const enabledCount = rules.filter((rule) => rule.enabled !== false).length;
	summary.textContent = `${rules.length} rule${rules.length === 1 ? '' : 's'} • ${enabledCount} enabled`;
}

/**
 * @returns {void}
 */
function renderSiteRules(): void {
	const rules = getSiteRulesList();
	const list = document.getElementById('siteRulesList');
	const empty = document.getElementById('siteRulesEmpty');
	if (!list || !empty) {
		return;
	}

	updateSiteRulesSummary(rules);
	empty.hidden = rules.length > 0;
	list.innerHTML = rules.map((rule, index) => {
		const validation = validateSiteRulePatternState(rule.pattern);
		const overrideLabels = getSiteRuleOverrideLabels(rule);
		const chips = overrideLabels.length > 0
			? overrideLabels.map((label) => `<span class="site-rule-chip">${escapeHtml(label)}</span>`).join('')
			: '<span class="site-rule-chip site-rule-chip--muted">No overrides</span>';

		return `
	            <article class="site-rule-item${rule.enabled === false ? ' is-disabled' : ''}">
	                <div class="site-rule-item__body">
	                    <div class="site-rule-item__header">
	                        <div>
	                            <h4 class="site-rule-item__title">${index + 1}. ${escapeHtml(rule.name)}</h4>
	                            <code class="site-rule-item__pattern">${escapeHtml(rule.pattern)}</code>
	                        </div>
	                        <label class="site-rule-toggle-inline">
	                            <input type="checkbox" data-site-rule-toggle="${escapeHtml(rule.id)}" ${
			rule.enabled === false ? '' : 'checked'
		} />
	                            <span>Enabled</span>
	                        </label>
	                    </div>
	                    <div class="site-rule-chip-list">${chips}</div>
	                    ${
			validation.valid ? '' : `<p class="site-rule-item__error">Invalid pattern: ${escapeHtml(validation.error)}</p>`
		}
	                </div>
	                <div class="site-rule-item__actions">
	                    <button type="button" class="btn btn-secondary btn-sm" data-site-rule-action="move-up" data-rule-id="${
			escapeHtml(rule.id)
		}" ${index === 0 ? 'disabled' : ''}>Up</button>
	                    <button type="button" class="btn btn-secondary btn-sm" data-site-rule-action="move-down" data-rule-id="${
			escapeHtml(rule.id)
		}" ${index === rules.length - 1 ? 'disabled' : ''}>Down</button>
	                    <button type="button" class="btn btn-secondary btn-sm" data-site-rule-action="edit" data-rule-id="${
			escapeHtml(rule.id)
		}">Edit</button>
	                    <button type="button" class="btn btn-danger btn-sm" data-site-rule-action="delete" data-rule-id="${
			escapeHtml(rule.id)
		}">Delete</button>
	                </div>
	            </article>
	        `;
	}).join('');

	if (siteRuleEditorState.ruleId && !findSiteRule(siteRuleEditorState.ruleId)) {
		closeSiteRuleEditor();
	}
}

/**
 * @returns {Promise<void>}
 */
async function saveSiteRuleEditor(): Promise<void> {
	const patternInput = getInputById('siteRulePattern');
	const rawPattern = patternInput?.value || '';
	const validation = validateSiteRulePatternState(rawPattern);
	const feedback = document.getElementById('siteRulePatternFeedback');

	if (!validation.valid) {
		if (patternInput) {
			patternInput.classList.add('is-invalid');
			patternInput.focus();
		}
		if (feedback) {
			feedback.textContent = validation.error;
			feedback.classList.remove('is-success');
			feedback.classList.add('is-error');
		}
		showToast(validation.error || 'Invalid site rule pattern', 'error');
		return;
	}

	const nextRule = {
		id: siteRuleEditorState.mode === 'edit' && siteRuleEditorState.ruleId
			? siteRuleEditorState.ruleId
			: buildSiteRuleIdState(),
		name: String(getInputById('siteRuleName')?.value || '').trim() || validation.normalizedPattern,
		enabled: getInputById('siteRuleEnabled')?.checked !== false,
		pattern: validation.normalizedPattern,
		overrides: buildSiteRuleOverridesFromEditor(),
	};

	const rules = getSiteRulesList();
	const nextRules = siteRuleEditorState.mode === 'edit'
		? rules.map((rule) => rule.id === siteRuleEditorState.ruleId ? nextRule : rule)
		: [...rules, nextRule];

	setSiteRules(nextRules);
	renderSiteRules();
	closeSiteRuleEditor();
	save();
}

/**
 * @param {string} ruleId
 * @param {'up'|'down'} direction
 * @returns {void}
 */
function moveSiteRule(ruleId: string, direction: 'up' | 'down'): void {
	const rules = getSiteRulesList();
	const index = rules.findIndex((rule) => rule.id === ruleId);
	if (index < 0) {
		return;
	}

	const targetIndex = direction === 'up' ? index - 1 : index + 1;
	if (targetIndex < 0 || targetIndex >= rules.length) {
		return;
	}

	const nextRules = rules.slice();
	const [rule] = nextRules.splice(index, 1);
	nextRules.splice(targetIndex, 0, rule);
	setSiteRules(nextRules);
	renderSiteRules();
	save();
}

/**
 * @param {string} ruleId
 * @returns {void}
 */
function deleteSiteRule(ruleId: string): void {
	const nextRules = getSiteRulesList().filter((rule) => rule.id !== ruleId);
	setSiteRules(nextRules);
	renderSiteRules();
	if (siteRuleEditorState.ruleId === ruleId) {
		closeSiteRuleEditor();
	}
	save();
}

/**
 * @param {string} ruleId
 * @param {boolean} [enabled]
 * @returns {void}
 */
function toggleSiteRuleEnabled(ruleId: string, enabled: boolean): void {
	const nextRules = getSiteRulesList().map((rule) => (
		rule.id === ruleId ? { ...rule, enabled: enabled !== false } : rule
	));
	setSiteRules(nextRules);
	renderSiteRules();
	save();
}

/**
 * @returns {void}
 */
function initSiteRuleControls(): void {
	document.getElementById('addSiteRule')?.addEventListener('click', () => openSiteRuleEditor());
	document.getElementById('cancelSiteRule')?.addEventListener('click', () => closeSiteRuleEditor());
	document.getElementById('saveSiteRule')?.addEventListener('click', () => {
		saveSiteRuleEditor().catch((error) => {
			console.error('Failed to save site rule:', error);
			showToast(String(error), 'error');
		});
	});
	document.getElementById('siteRulePattern')?.addEventListener('input', (event) => {
		const target = event.target;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		const validation = validateSiteRulePatternState(target.value);
		const feedback = document.getElementById('siteRulePatternFeedback');
		target.classList.toggle('is-invalid', !validation.valid && target.value.trim().length > 0);
		if (!feedback) {
			return;
		}
		if (!target.value.trim()) {
			feedback.textContent = '';
			feedback.classList.remove('is-error', 'is-success');
			return;
		}
		feedback.textContent = validation.valid ? `Matches as ${validation.normalizedPattern}` : validation.error;
		feedback.classList.toggle('is-error', !validation.valid);
		feedback.classList.toggle('is-success', validation.valid);
	});

	Object.values(SITE_RULE_TEXT_FIELD_IDS).forEach(({ toggleId }) => {
		document.getElementById(toggleId)?.addEventListener('change', refreshSiteRuleTextOverrideStates);
	});

	document.getElementById('siteRulesList')?.addEventListener('click', (event) => {
		const button = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-site-rule-action]') : null;
		if (!button) {
			return;
		}

		const ruleId = button.dataset.ruleId;
		const action = button.dataset.siteRuleAction;
		if (!ruleId || !action) {
			return;
		}

		if (action === 'edit') {
			openSiteRuleEditor(ruleId);
			return;
		}
		if (action === 'move-up') {
			moveSiteRule(ruleId, 'up');
			return;
		}
		if (action === 'move-down') {
			moveSiteRule(ruleId, 'down');
			return;
		}
		if (action === 'delete') {
			deleteSiteRule(ruleId);
		}
	});

	document.getElementById('siteRulesList')?.addEventListener('change', (event) => {
		const toggle = event.target instanceof HTMLInputElement ? event.target.closest<HTMLInputElement>('[data-site-rule-toggle]') : null;
		if (!(toggle instanceof HTMLInputElement)) {
			return;
		}
		const ruleId = toggle.dataset.siteRuleToggle;
		if (!ruleId) {
			return;
		}
		toggleSiteRuleEnabled(ruleId, toggle.checked);
	});

	resetSiteRuleEditor();
	renderSiteRules();
}

function usesOptionalNativeMessagingPermission() {
	const optionalPermissions = browser.runtime?.getManifest?.().optional_permissions || [];
	return Array.isArray(optionalPermissions) && optionalPermissions.includes('nativeMessaging');
}

function isNativeMessagingApiAvailable() {
	const chromeRuntime = chromeApi && typeof chromeApi === 'object' ? Reflect.get(chromeApi, 'runtime') : null;
	const chromeConnectNative = chromeRuntime && typeof chromeRuntime === 'object'
		? Reflect.get(chromeRuntime, 'connectNative')
		: null;
	return Boolean(
		browser.runtime?.connectNative
			|| chromeConnectNative,
	);
}

function getAgentBridgeInstallCommandForPlatform(platformOs: string | undefined): string {
	switch (String(platformOs || '').trim().toLowerCase()) {
		case 'win':
			return '.\\snipsnip.exe install-host';
		case 'mac':
		case 'linux':
			return './snipsnip install-host';
		default:
			return 'snipsnip install-host';
	}
}

function renderAgentBridgeInstallCommand() {
	const commandEl = document.getElementById('agentBridgeInstallCommand');
	if (commandEl) {
		commandEl.textContent = agentBridgeInstallCommand;
	}
}

function updateAgentBridgeActionButton(state = 'disabled') {
	const button = document.getElementById('refreshAgentBridgeStatus');
	if (!button) {
		return;
	}

	if (state === 'permission-needed') {
		button.textContent = 'Grant Permission';
		button.setAttribute('aria-label', 'Grant native messaging permission for Agent Bridge');
		return;
	}

	button.textContent = 'Check Connection';
	button.setAttribute('aria-label', 'Check Agent Bridge connection status');
}

async function resolveAgentBridgeInstallCommand() {
	const platformInfo = await browser.runtime?.getPlatformInfo?.().catch(() => null);
	agentBridgeInstallCommand = getAgentBridgeInstallCommandForPlatform(platformInfo?.os);
	renderAgentBridgeInstallCommand();
	return agentBridgeInstallCommand;
}

function normalizeLibrarySettingsState(settings: Partial<LibrarySettings> | null | undefined): LibrarySettings {
	const libraryApi = getLibraryStateApi();
	if (libraryApi?.normalizeLibrarySettings) {
		return libraryApi.normalizeLibrarySettings(settings ?? undefined);
	}

	return {
		enabled: settings?.enabled !== false,
		autoSaveOnPopupOpen: settings?.autoSaveOnPopupOpen !== false,
		itemsToKeep: Math.max(1, Number.parseInt(String(settings?.itemsToKeep ?? 10), 10) || 10),
	};
}

async function saveLibrarySettingsState(nextSettings: Partial<LibrarySettings>): Promise<LibrarySettings> {
	const libraryApi = getLibraryStateApi();
	librarySettings = normalizeLibrarySettingsState(nextSettings);

	if (libraryApi?.saveLibrarySettings) {
		librarySettings = await libraryApi.saveLibrarySettings(librarySettings);
	} else {
		await storage.setItem('local:librarySettings', librarySettings);
	}

	return librarySettings;
}

async function loadLibrarySettingsState(): Promise<LibrarySettings> {
	const libraryApi = getLibraryStateApi();
	if (libraryApi?.loadLibrarySettings) {
		librarySettings = await libraryApi.loadLibrarySettings();
	} else {
		const value = await storage.getItem('local:librarySettings');
		librarySettings = normalizeLibrarySettingsState(value);
	}

	return librarySettings;
}

async function resetLibrarySettingsState(): Promise<LibrarySettings> {
	const libraryApi = getLibraryStateApi();
	if (libraryApi?.resetLibrarySettings) {
		librarySettings = await libraryApi.resetLibrarySettings();
		return librarySettings;
	}

	librarySettings = normalizeLibrarySettingsState(undefined);
	await storage.setItem('local:librarySettings', librarySettings);
	return librarySettings;
}

async function trimLibraryItemsState(itemsToKeep: number): Promise<unknown[]> {
	const libraryApi = getLibraryStateApi();
	if (libraryApi?.trimStoredLibraryItems) {
		return await libraryApi.trimStoredLibraryItems(itemsToKeep);
	}

	return [];
}

async function clearLibraryItemsState() {
	const libraryApi = getLibraryStateApi();
	if (libraryApi?.clearLibraryItems) {
		return await libraryApi.clearLibraryItems();
	}

	await storage.removeItem('local:libraryItems');
	return [];
}

function normalizeAgentBridgeSettingsState(settings: Partial<AgentBridgeSettings> | null | undefined): AgentBridgeSettings {
	const bridgeApi = getAgentBridgeStateApi();
	if (bridgeApi?.normalizeSettings) {
		return bridgeApi.normalizeSettings(settings ?? undefined);
	}

	return {
		enabled: settings?.enabled === true,
	};
}

function normalizeAgentBridgeStatusState(status: Partial<AgentBridgeStatus> | null | undefined): AgentBridgeStatus {
	const bridgeApi = getAgentBridgeStateApi();
	if (bridgeApi?.normalizeStatus) {
		return bridgeApi.normalizeStatus(status ?? undefined);
	}

	return {
		enabled: status?.enabled === true,
		permissionGranted: status?.permissionGranted === true,
		connecting: status?.connecting === true,
		connected: status?.connected === true,
		hostInstalled: status?.hostInstalled === true,
		browser: typeof status?.browser === 'string' ? status.browser.trim().toLowerCase() : '',
		hostVersion: typeof status?.hostVersion === 'string' ? status.hostVersion.trim() : '',
		lastError: typeof status?.lastError === 'string' ? status.lastError.trim() : '',
		updatedAt: typeof status?.updatedAt === 'string' ? status.updatedAt.trim() : '',
	};
}

async function saveAgentBridgeSettingsState(nextSettings: Partial<AgentBridgeSettings>): Promise<AgentBridgeSettings> {
	const bridgeApi = getAgentBridgeStateApi();
	agentBridgeSettings = normalizeAgentBridgeSettingsState(nextSettings);

	if (bridgeApi?.saveSettings) {
		agentBridgeSettings = await bridgeApi.saveSettings(agentBridgeSettings);
	} else {
		await storage.setItem('local:agentBridgeSettings', agentBridgeSettings);
	}

	return agentBridgeSettings;
}

async function loadAgentBridgeSettingsState() {
	const bridgeApi = getAgentBridgeStateApi();
	if (bridgeApi?.loadSettings) {
		agentBridgeSettings = await bridgeApi.loadSettings();
	} else {
		const value = await storage.getItem('local:agentBridgeSettings');
		agentBridgeSettings = normalizeAgentBridgeSettingsState(value);
	}

	return agentBridgeSettings;
}

async function loadAgentBridgeStatusState() {
	const bridgeApi = getAgentBridgeStateApi();
	if (bridgeApi?.loadStatus) {
		agentBridgeStatus = await bridgeApi.loadStatus();
	} else {
		const value = await storage.getItem('local:agentBridgeStatus');
		agentBridgeStatus = normalizeAgentBridgeStatusState(value);
	}

	return agentBridgeStatus;
}

async function refreshAgentBridgeStatusState() {
	if (!browser.runtime?.sendMessage) {
		await loadAgentBridgeStatusState();
		return agentBridgeStatus;
	}

	try {
		const status = await browser.runtime.sendMessage({
			type: 'refresh-agent-bridge-status',
		});
		agentBridgeStatus = normalizeAgentBridgeStatusState(status);
	} catch (error) {
		console.warn('Failed to refresh Agent Bridge status:', error);
		await loadAgentBridgeStatusState();
	}

	return agentBridgeStatus;
}

async function requestAgentBridgePermission() {
	if (!browser.permissions?.request) {
		showToast('This browser cannot request native messaging permission here', 'error');
		return { granted: false, reloadRequired: false };
	}

	const granted = await browser.permissions.request({
		permissions: ['nativeMessaging'],
	}).catch((error: unknown) => {
		console.error('Failed to request native messaging permission:', error);
		return false;
	});

	if (!granted) {
		showToast('Agent Bridge permission was not granted', 'error');
		return { granted: false, reloadRequired: false };
	}

	return {
		granted: true,
		reloadRequired: usesOptionalNativeMessagingPermission() && !isNativeMessagingApiAvailable(),
	};
}

async function reloadExtensionForAgentBridgePermissionGrant() {
	const container = document.getElementById('agent-bridge-container');
	const statusHint = document.getElementById('agentBridgeStatusHint');
	const statusText = document.getElementById('agentBridgeStatusText');
	const refreshBtn = getButtonById('refreshAgentBridgeStatus');

	if (container) {
		container.dataset.bridgeState = 'starting';
		container.dataset.permissionState = 'idle';
	}
	hidePermissionPanel();
	if (statusText) {
		statusText.textContent = 'Reloading extension';
	}
	if (statusHint) {
		statusHint.textContent = 'Permission granted. SnipSnip is reloading once to finish enabling the Agent Bridge.';
	}
	if (refreshBtn) {
		refreshBtn.disabled = true;
		refreshBtn.textContent = 'Reloading...';
	}

	await new Promise((resolve) => setTimeout(resolve, 150));
	browser.runtime?.reload?.();
}

/* ── Permission Panel Management ── */

function showPermissionPanel(panelState: string): void {
	const panel = getHtmlElementById('agentBridgePermissionPanel');
	const container = getHtmlElementById('agent-bridge-container');
	if (!panel) return;

	panel.hidden = false;
	panel.querySelectorAll<HTMLElement>('.permission-panel-state').forEach((el) => {
		el.classList.toggle('is-active', el.dataset.panelState === panelState);
	});

	if (container) {
		container.dataset.permissionState = panelState;
	}
}

function hidePermissionPanel() {
	const panel = getHtmlElementById('agentBridgePermissionPanel');
	const container = getHtmlElementById('agent-bridge-container');
	if (panel) {
		panel.hidden = true;
		panel.querySelectorAll<HTMLElement>('.permission-panel-state').forEach((el) => {
			el.classList.remove('is-active');
		});
	}
	if (container) {
		container.dataset.permissionState = 'idle';
	}
}

async function handlePermissionContinue() {
	const continueBtn = document.getElementById('agentBridgePermContinue');
	if (continueBtn) {
		continueBtn.disabled = true;
		continueBtn.textContent = 'Requesting...';
	}

	try {
		const permissionResult = await requestAgentBridgePermission();

		if (!permissionResult.granted) {
			// Show denied state
			showPermissionPanel('denied');
			return;
		}

		// Permission granted
		hidePermissionPanel();
		agentBridgeSettings.enabled = true;
		await saveAgentBridgeSettingsState(agentBridgeSettings);

		if (permissionResult.reloadRequired) {
			await reloadExtensionForAgentBridgePermissionGrant();
			return;
		}

		const toggle = document.querySelector("[name='agentBridgeEnabled']");
		if (toggle) toggle.checked = true;

		const refreshedStatus = await refreshAgentBridgeStatusState();
		setCurrentAgentBridgeChoice(agentBridgeSettings, refreshedStatus);
		showToast('Agent Bridge enabled', 'success');
	} catch (error) {
		console.error('Failed to request Agent Bridge permission:', error);
		showPermissionPanel('denied');
	} finally {
		if (continueBtn) {
			continueBtn.disabled = false;
			continueBtn.textContent = 'Continue';
		}
	}
}

function handlePermissionCancel() {
	hidePermissionPanel();
	const toggle = queryElementOfType("[name='agentBridgeEnabled']", HTMLInputElement);
	if (toggle) toggle.checked = false;
	agentBridgeSettings.enabled = false;
	setCurrentAgentBridgeChoice(agentBridgeSettings, agentBridgeStatus);
}

async function handlePermissionRetry() {
	showPermissionPanel('preflight');
}

function handlePermissionDismiss() {
	hidePermissionPanel();
	const toggle = queryElementOfType("[name='agentBridgeEnabled']", HTMLInputElement);
	if (toggle) toggle.checked = false;
	agentBridgeSettings.enabled = false;
	setCurrentAgentBridgeChoice(agentBridgeSettings, agentBridgeStatus);
}

function normalizeImportedOptionsState(importedOptions: unknown): OptionsState {
	const optionsStateApi = getOptionsStateApi();
	const importedOptionsRecord = isRecord(importedOptions) ? importedOptions : undefined;
	if (optionsStateApi?.normalizeImportedOptions) {
		return optionsStateApi.normalizeImportedOptions(importedOptionsRecord, defaultOptions) as OptionsState;
	}

	const normalizedOptions = {
		...defaultOptions,
		...(importedOptionsRecord || {}),
		tableFormatting: {
			...(defaultOptions.tableFormatting || {}),
			...(isRecord(importedOptionsRecord?.tableFormatting) ? importedOptionsRecord.tableFormatting : {}),
		},
	};

	normalizedOptions.sendToCustomTargets = normalizeCustomSendToTargetsState(normalizedOptions.sendToCustomTargets);
	normalizedOptions.defaultSendToTarget = normalizeDefaultSendToTargetState(
		normalizedOptions.defaultSendToTarget,
		normalizedOptions.sendToCustomTargets,
	);
	normalizedOptions.sendToMaxUrlLength = normalizeSendToMaxUrlLengthState(
		normalizedOptions.sendToMaxUrlLength,
		defaultOptions?.sendToMaxUrlLength,
	);

	const validPrimaryActions = new Set(['markdown', 'text', 'html', 'pdf', 'copy', 'sendTo']);
	normalizedOptions.defaultExportType = validPrimaryActions.has(normalizedOptions.defaultExportType)
		? normalizedOptions.defaultExportType
		: defaultOptions.defaultExportType;

	return normalizedOptions;
}

function getContextMenuTransitionState(previousOptions: Record<string, unknown>, nextOptions: Record<string, unknown>) {
	const optionsStateApi = getOptionsStateApi();
	if (optionsStateApi?.getContextMenuTransition) {
		return optionsStateApi.getContextMenuTransition(previousOptions, nextOptions);
	}

	const previousEnabled = Boolean(previousOptions?.contextMenus);
	const nextEnabled = Boolean(nextOptions?.contextMenus);
	if (previousEnabled === nextEnabled) {
		return 'none';
	}
	return nextEnabled ? 'create' : 'remove';
}

function resetOptionKeysState(keys: string[] | string) {
	const optionsStateApi = getOptionsStateApi();
	if (optionsStateApi?.resetOptionKeys) {
		return optionsStateApi.resetOptionKeys(options, defaultOptions, keys);
	}

	const nextOptions = JSON.parse(JSON.stringify(options));
	const keyList = Array.isArray(keys) ? keys : String(keys || '').split(',');
	keyList.forEach((rawKey) => {
		const key = String(rawKey || '').trim();
		if (!key) return;

		if (key === 'tableFormatting') {
			nextOptions.tableFormatting = JSON.parse(JSON.stringify(defaultOptions.tableFormatting || {}));
			return;
		}

		if (key.startsWith('tableFormatting.')) {
			const optionName = key.split('.')[1];
			if (!optionName) return;
			nextOptions.tableFormatting = nextOptions.tableFormatting || {};
			nextOptions.tableFormatting[optionName] = defaultOptions.tableFormatting?.[optionName];
			return;
		}

		nextOptions[key] = typeof defaultOptions[key] === 'object'
			? JSON.parse(JSON.stringify(defaultOptions[key]))
			: defaultOptions[key];
	});

	return {
		options: normalizeImportedOptionsState(nextOptions),
		contextMenuAction: getContextMenuTransitionState(options, nextOptions),
	};
}

function resetAllOptionsState() {
	const optionsStateApi = getOptionsStateApi();
	if (optionsStateApi?.resetAllOptions) {
		return optionsStateApi.resetAllOptions(options, defaultOptions);
	}

	const nextOptions = JSON.parse(JSON.stringify(defaultOptions));
	return {
		options: nextOptions,
		contextMenuAction: getContextMenuTransitionState(options, nextOptions),
	};
}

function buildExportFilenameState(date: Date | string | undefined) {
	const optionsStateApi = getOptionsStateApi();
	if (optionsStateApi?.buildExportFilename) {
		return optionsStateApi.buildExportFilename(date);
	}

	const d = date instanceof Date ? date : new Date(date);
	const datestring = `${d.getFullYear()}-${(`0${d.getMonth() + 1}`).slice(-2)}-${(`0${d.getDate()}`).slice(-2)}`;
	return `SnipSnip-export-${datestring}.json`;
}

function buildExportPayload() {
	return {
		...options,
		librarySettings: normalizeLibrarySettingsState(librarySettings),
	};
}

function applyContextMenuTransition(action: 'none' | 'create' | 'remove') {
	if (action === 'create') {
		createMenus();
	} else if (action === 'remove') {
		browser.contextMenus.removeAll();
	}
}

function buildPopupThemeCacheSnapshot(source: OptionsState = options || defaultOptions) {
	return {
		popupTheme: source?.popupTheme || 'system',
		specialTheme: normalizeSpecialTheme(source?.specialTheme),
		colorBlindTheme: normalizeColorBlindTheme(source?.colorBlindTheme),
		specialThemeIcon: source?.specialThemeIcon !== false,
		popupAccent: source?.popupAccent || 'sage',
		showThemeToggleInPopup: source?.showThemeToggleInPopup !== false,
		editorTheme: source?.editorTheme || 'default',
	};
}

function persistPopupThemeCache(source: OptionsState = options || defaultOptions) {
	try {
		localStorage.setItem(POPUP_THEME_CACHE_KEY, JSON.stringify(buildPopupThemeCacheSnapshot(source)));
	} catch (error) {
		console.debug('Unable to persist popup theme cache:', error);
	}
}

function normalizeColorBlindTheme(value: unknown): ColorBlindTheme {
	const normalized = String(value || 'deuteranopia');
	return normalized === 'protanopia' || normalized === 'tritanopia' ? normalized : 'deuteranopia';
}

function getColorBlindThemeClassName(value: unknown = options?.colorBlindTheme): string {
	return `colorblind-theme-${normalizeColorBlindTheme(value)}`;
}

const CB_DROPDOWN_LABELS: Record<ColorBlindTheme, string> = {
	deuteranopia: 'Deuteranopia',
	protanopia: 'Protanopia',
	tritanopia: 'Tritanopia',
};

function updateCbDropdownLabel(value: ColorBlindTheme): void {
	const labelEl = getHtmlElementById('colorBlindThemeBtnLabel');
	if (labelEl) labelEl.textContent = CB_DROPDOWN_LABELS[value] || 'Deuteranopia';
	const panel = getHtmlElementById('colorBlindThemePanel');
	if (panel) {
		queryAllOfType('.dd-item[data-value]', HTMLElement, panel).forEach(item => {
			item.setAttribute('aria-selected', String(item.dataset.value === value));
		});
	}
}

function toggleCbDropdown(e: Event) {
	e.stopPropagation();
	const panel = getHtmlElementById('colorBlindThemePanel');
	const btn = getButtonById('colorBlindThemeBtn');
	if (!panel || !btn) return;
	const willOpen = panel.hidden;
	panel.hidden = !willOpen;
	btn.setAttribute('aria-expanded', String(willOpen));
}

function closeCbDropdown() {
	const panel = getHtmlElementById('colorBlindThemePanel');
	const btn = getButtonById('colorBlindThemeBtn');
	if (panel) panel.hidden = true;
	if (btn) btn.setAttribute('aria-expanded', 'false');
}

// Apply theme mode and accent color to the Options page itself
function applyThemeSettings() {
	const root = document.documentElement;
	const specialTheme = normalizeSpecialTheme(options.specialTheme);

	// Apply theme mode
	root.classList.remove('theme-light', 'theme-dark', 'theme-system');
	root.classList.add(`theme-${options.popupTheme || 'system'}`);

	root.classList.remove(...SPECIAL_THEME_CLASS_NAMES);
	root.classList.remove(...COLORBLIND_VARIANT_CLASS_NAMES);
	if (specialTheme !== 'none') {
		root.classList.add(`special-theme-${specialTheme}`);
	}

	root.classList.toggle('hide-theme-icon', options.specialThemeIcon === false);

	// Apply accent color
	root.classList.remove(...ACCENT_CLASS_NAMES);
	const accent = options.popupAccent || 'sage';
	if (specialTheme === 'none' && accent !== 'sage') {
		root.classList.add(`accent-${accent}`);
	}

	persistPopupThemeCache(options);
}

function updateSpecialThemeControlState() {
	const specialTheme = normalizeSpecialTheme(options.specialTheme);
	const specialThemeActive = specialTheme !== 'none';
	const colorBlindThemeActive = false;
	const themeHasIcon = specialTheme === 'atla' || specialTheme === 'ben10' || specialTheme === 'claude'
		|| specialTheme === 'perplexity' || specialTheme === 'openai';
	const accentGroup = getHtmlElementById('popupAccentGroup');
	const editorThemeGroup = getHtmlElementById('editorThemeGroup');
	const accentNote = getHtmlElementById('popupAccentThemeNote');
	const editorThemeNote = getHtmlElementById('editorThemeLockNote');
	const iconRow = getHtmlElementById('specialThemeIconRow');
	const iconInput = queryElementOfType("[name='specialThemeIcon']", HTMLInputElement);
	const colorBlindThemeRow = getHtmlElementById('colorBlindThemeRow');
	const colorBlindThemeInput = queryElementOfType("[name='colorBlindTheme']", HTMLInputElement);

	if (iconRow) iconRow.classList.toggle('is-disabled', !themeHasIcon);
	if (iconInput) iconInput.disabled = !themeHasIcon;
	if (colorBlindThemeRow) {
		colorBlindThemeRow.hidden = !colorBlindThemeActive;
		colorBlindThemeRow.classList.toggle('is-disabled', !colorBlindThemeActive);
		colorBlindThemeRow.setAttribute('aria-hidden', String(!colorBlindThemeActive));
	}
	if (colorBlindThemeInput) {
		colorBlindThemeInput.disabled = !colorBlindThemeActive;
		colorBlindThemeInput.value = normalizeColorBlindTheme(options.colorBlindTheme);
	}
	const colorBlindThemeBtn = getButtonById('colorBlindThemeBtn');
	if (colorBlindThemeBtn) {
		colorBlindThemeBtn.disabled = !colorBlindThemeActive;
		updateCbDropdownLabel(normalizeColorBlindTheme(options.colorBlindTheme));
		if (!colorBlindThemeActive) closeCbDropdown();
	}

	[accentGroup, editorThemeGroup].forEach((group) => {
		group?.classList.toggle('is-disabled', specialThemeActive);
		group?.setAttribute('aria-disabled', String(specialThemeActive));
	});

	if (accentNote) {
		accentNote.hidden = !specialThemeActive;
	}

	if (editorThemeNote) {
		editorThemeNote.hidden = !specialThemeActive;
	}

	queryAllOfType("input[name='popupAccent']", HTMLInputElement).forEach((input) => {
		input.disabled = specialThemeActive;
	});

	queryAllOfType("input[name='editorTheme']", HTMLInputElement).forEach((input) => {
		input.disabled = specialThemeActive;
	});
}

function configureReviewLink() {
	const reviewLink = queryElementOfType('#leave-review-link', HTMLAnchorElement);
	if (!reviewLink || !browser?.runtime?.getURL) return;

	const chromeUrl = reviewLink.dataset.chromeUrl || reviewLink.href;
	const firefoxUrl = reviewLink.dataset.firefoxUrl || reviewLink.href;
	const extensionUrl = browser.runtime.getURL('/');
	const isFirefox = extensionUrl.startsWith('moz-extension://');

	reviewLink.href = isFirefox ? firefoxUrl : chromeUrl;
}

const _saveOptions = (e: Event) => {
	e.preventDefault();

	const customSendToTargets = normalizeCustomSendToTargetsState(options.sendToCustomTargets);
	options = {
		frontmatter: getTextAreaValueByName('frontmatter'),
		backmatter: getTextAreaValueByName('backmatter'),
		title: getInputValueByName('title'),
		disallowedChars: getInputValueByName('disallowedChars'),
		includeTemplate: getCheckedByName('includeTemplate'),
		saveAs: getCheckedByName('saveAs'),
		downloadImages: getCheckedByName('downloadImages'),
		imagePrefix: getInputValueByName('imagePrefix'),
		mdClipsFolder: getInputValueByName('mdClipsFolder'),
		defaultExportType: getCheckedValue(document.querySelectorAll("input[name='defaultExportType']")) || 'markdown',
		defaultSendToTarget: normalizeDefaultSendToTargetState(
			getCheckedValue(document.querySelectorAll("input[name='defaultSendToTarget']")) || DEFAULT_SEND_TO_TARGET,
			customSendToTargets,
		),
		sendToCustomTargets: customSendToTargets,
		sendToMaxUrlLength: normalizeSendToMaxUrlLengthState(
			getInputValueByName('sendToMaxUrlLength'),
			defaultOptions?.sendToMaxUrlLength,
		),
		turndownEscape: getCheckedByName('turndownEscape'),
		hashtagHandling: getCheckedValue(document.querySelectorAll("input[name='hashtagHandling']")),
		contextMenus: getCheckedByName('contextMenus'),
		batchProcessingEnabled: getCheckedByName('batchProcessingEnabled'),
		obsidianIntegration: getCheckedByName('obsidianIntegration'),
		obsidianVault: getInputValueByName('obsidianVault'),
		obsidianFolder: getInputValueByName('obsidianFolder'),

		preserveCodeFormatting: getCheckedByName('preserveCodeFormatting'),
		autoDetectCodeLanguage: getCheckedByName('autoDetectCodeLanguage'),

		// Add table formatting options
		tableFormatting: {
			stripLinks: getCheckedByName('tableFormatting.stripLinks'),
			stripFormatting: getCheckedByName('tableFormatting.stripFormatting'),
			prettyPrint: getCheckedByName('tableFormatting.prettyPrint'),
			centerText: getCheckedByName('tableFormatting.centerText'),
		},

		headingStyle: getCheckedValue(document.querySelectorAll("input[name='headingStyle']")),
		hr: getCheckedValue(document.querySelectorAll("input[name='hr']")),
		bulletListMarker: getCheckedValue(document.querySelectorAll("input[name='bulletListMarker']")),
		codeBlockStyle: getCheckedValue(document.querySelectorAll("input[name='codeBlockStyle']")),
		fence: getCheckedValue(document.querySelectorAll("input[name='fence']")),
		emDelimiter: getCheckedValue(document.querySelectorAll("input[name='emDelimiter']")),
		strongDelimiter: getCheckedValue(document.querySelectorAll("input[name='strongDelimiter']")),
		linkStyle: getCheckedValue(document.querySelectorAll("input[name='linkStyle']")),
		linkReferenceStyle: getCheckedValue(document.querySelectorAll("input[name='linkReferenceStyle']")),
		imageStyle: getCheckedValue(document.querySelectorAll("input[name='imageStyle']")),
		imageRefStyle: getCheckedValue(document.querySelectorAll("input[name='imageRefStyle']")),
		downloadMode: getCheckedValue(document.querySelectorAll("input[name='downloadMode']")),
		popupTheme: getCheckedValue(document.querySelectorAll("input[name='popupTheme']")),
		specialTheme: getCheckedValue(document.querySelectorAll("input[name='specialTheme']")) || 'none',
		colorBlindTheme: normalizeColorBlindTheme(getInputValueByName('colorBlindTheme')),
		specialThemeIcon: getCheckedByName('specialThemeIcon'),
		popupAccent: getCheckedValue(document.querySelectorAll("input[name='popupAccent']")),
		compactMode: getCheckedByName('compactMode'),
		showThemeToggleInPopup: getCheckedByName('showThemeToggleInPopup'),
		showUserGuideIcon: getCheckedByName('showUserGuideIcon'),
		editorTheme: getCheckedValue(document.querySelectorAll("input[name='editorTheme']")),
		siteRules: normalizeSiteRulesState(options.siteRules),
	};

	save();
};

const save = (
	feedback: false | { message: string; type: string } = { message: 'Options Saved 💾', type: 'success' },
) => {
	const spinner = document.getElementById('spinner');
	if (spinner) spinner.style.display = 'block';
	options = normalizeImportedOptionsState(options);
	options.siteRules = normalizeSiteRulesState(options.siteRules);

	const safeUpdateMenu = (id: string, update: { checked: boolean }) => {
		if (!browser.contextMenus || typeof browser.contextMenus.update !== 'function') {
			return Promise.resolve();
		}
		return browser.contextMenus.update(id, update).catch((err: unknown) => {
			const message = String(err?.message || err || '');
			if (!message.includes('Cannot find menu item')) {
				console.warn(`Failed to update context menu '${id}':`, err);
			}
		});
	};

	setItemsBag('sync', options)
		.then(() => {
			if (!options.contextMenus) {
				return Promise.resolve();
			}
			return Promise.allSettled([
				safeUpdateMenu('toggle-includeTemplate', {
					checked: options.includeTemplate,
				}),
				safeUpdateMenu('tabtoggle-includeTemplate', {
					checked: options.includeTemplate,
				}),
				safeUpdateMenu('toggle-downloadImages', {
					checked: options.downloadImages,
				}),
				safeUpdateMenu('tabtoggle-downloadImages', {
					checked: options.downloadImages,
				}),
			]);
		})
		.then(() => {
			if (feedback !== false) {
				showToast(feedback?.message || 'Options Saved 💾', feedback?.type || 'success');
			}
			if (spinner) spinner.style.display = 'none';
		})
		.catch((err: unknown) => {
			showToast(String(err), 'error');
			if (spinner) spinner.style.display = 'none';
		});
};

// Toast notification system
function showToast(message: string, type: string) {
	const toast = getElementByIdOfType('status', HTMLElement) as ToastElement | null;
	if (!toast) {
		return;
	}
	toast.textContent = message;
	toast.className = `toast ${type} visible`;
	clearTimeout(toast._hideTimeout);
	toast._hideTimeout = setTimeout(() => {
		toast.classList.remove('visible');
	}, 3000);
}

function hideToast() {
	this.classList.remove('visible');
}

function buildTemplatePreviewSampleArticle() {
	const sampleUrl = new URL('https://example.com/article');
	const samplePageUrl = new URL('https://example.com/article');

	return {
		title: 'Example Article',
		pageTitle: 'Example Article',
		length: '1842',
		excerpt: 'A compact sample summary for template preview output.',
		description: 'A compact sample summary for template preview output.',
		byline: 'Jane Doe',
		author: 'Jane Doe',
		dir: 'ltr',
		keywords: ['example', 'markdown', 'templates'],
		siteName: 'Example Site',
		baseURI: sampleUrl.href,
		pageURL: samplePageUrl.href,
		tabURL: samplePageUrl.href,
		origin: sampleUrl.origin,
		host: sampleUrl.host,
		hostname: sampleUrl.hostname,
		port: sampleUrl.port,
		protocol: sampleUrl.protocol,
		pathname: sampleUrl.pathname,
		search: sampleUrl.search,
		hash: sampleUrl.hash,
		pageOrigin: samplePageUrl.origin,
		pageHost: samplePageUrl.host,
		pageHostname: samplePageUrl.hostname,
		pagePort: samplePageUrl.port,
		pageProtocol: samplePageUrl.protocol,
		pagePathname: samplePageUrl.pathname,
		pageSearch: samplePageUrl.search,
		pageHash: samplePageUrl.hash,
	};
}

function renderTemplatePreviewOutput(outputId: string, templateValue: unknown) {
	const output = document.getElementById(outputId);
	if (!output) {
		return;
	}

	const normalizedTemplate = String(templateValue || '');
	if (!normalizedTemplate.trim()) {
		output.textContent = 'Nothing to preview yet.';
		output.classList.add('is-empty');
		return;
	}

	const templateUtils = getTemplateUtils();
	const renderedText = typeof templateUtils?.textReplace === 'function'
		? templateUtils.textReplace(normalizedTemplate, buildTemplatePreviewSampleArticle())
		: normalizedTemplate;

	output.textContent = renderedText;
	output.classList.toggle('is-empty', !renderedText.trim());
}

function renderTemplatePreviews() {
	renderTemplatePreviewOutput('frontmatter-preview-output', getTextAreaById('frontmatter')?.value || '');
	renderTemplatePreviewOutput('backmatter-preview-output', getTextAreaById('backmatter')?.value || '');
}

function bindTemplatePreviewListeners() {
	if (templatePreviewListenersBound) {
		return;
	}

	['frontmatter', 'backmatter'].forEach((id) => {
		const input = getTextAreaById(id);
		if (!input) {
			return;
		}

		input.addEventListener('input', renderTemplatePreviews);
	});

	templatePreviewListenersBound = true;
}

const setCurrentChoice = (result: Record<string, unknown>) => {
	options = normalizeImportedOptionsState(result);

	// if browser doesn't support the download api (i.e. Safari)
	// we have to use contentLink download mode
	if (!browser.downloads) {
		options.downloadMode = 'contentLink';
		queryAllOfType("[name='downloadMode']", HTMLInputElement).forEach((el) => {
			el.disabled = true;
		});
		const cardDesc = queryElementOfType('#downloadMode .card-desc', HTMLElement);
		if (cardDesc) {
			cardDesc.innerText = 'The Downloads API is unavailable in this browser.';
		}
	}

	const downloadImages = options.downloadImages && options.downloadMode === 'downloadsApi';

	const imageStyle = String(options.imageStyle || 'originalSource');
	if (!downloadImages && (imageStyle === 'markdown' || imageStyle.startsWith('obsidian'))) {
		options.imageStyle = 'originalSource';
	}

	options.preserveCodeFormatting = options.preserveCodeFormatting === true;
	options.autoDetectCodeLanguage = options.autoDetectCodeLanguage !== false;

	const frontmatterInput = queryElementOfType("[name='frontmatter']", HTMLTextAreaElement);
	const backmatterInput = queryElementOfType("[name='backmatter']", HTMLTextAreaElement);
	const titleInput = queryElementOfType("[name='title']", HTMLInputElement);
	const disallowedCharsInput = queryElementOfType("[name='disallowedChars']", HTMLInputElement);
	const includeTemplateInput = queryElementOfType("[name='includeTemplate']", HTMLInputElement);
	const saveAsInput = queryElementOfType("[name='saveAs']", HTMLInputElement);
	const downloadImagesInput = queryElementOfType("[name='downloadImages']", HTMLInputElement);
	const imagePrefixInput = queryElementOfType("[name='imagePrefix']", HTMLInputElement);
	const mdClipsFolderInput = queryElementOfType("[name='mdClipsFolder']", HTMLInputElement);
	const turndownEscapeInput = queryElementOfType("[name='turndownEscape']", HTMLInputElement);
	const contextMenusInput = queryElementOfType("[name='contextMenus']", HTMLInputElement);
	const batchProcessingEnabledInput = queryElementOfType("[name='batchProcessingEnabled']", HTMLInputElement);
	const obsidianIntegrationInput = queryElementOfType("[name='obsidianIntegration']", HTMLInputElement);
	const obsidianVaultInput = queryElementOfType("[name='obsidianVault']", HTMLInputElement);
	const obsidianFolderInput = queryElementOfType("[name='obsidianFolder']", HTMLInputElement);
	const sendToMaxUrlLengthInput = queryElementOfType("[name='sendToMaxUrlLength']", HTMLInputElement);
	if (frontmatterInput) frontmatterInput.value = String(options.frontmatter || '');
	if (backmatterInput) backmatterInput.value = String(options.backmatter || '');
	if (titleInput) titleInput.value = String(options.title || '');
	if (disallowedCharsInput) disallowedCharsInput.value = String(options.disallowedChars || '');
	if (includeTemplateInput) includeTemplateInput.checked = options.includeTemplate === true;
	if (saveAsInput) saveAsInput.checked = options.saveAs === true;
	if (downloadImagesInput) downloadImagesInput.checked = options.downloadImages === true;
	if (imagePrefixInput) imagePrefixInput.value = String(options.imagePrefix || '');
	if (mdClipsFolderInput) {
		mdClipsFolderInput.value = typeof result.mdClipsFolder === 'string'
			? result.mdClipsFolder
			: '';
	}
	if (turndownEscapeInput) turndownEscapeInput.checked = options.turndownEscape === true;
	if (contextMenusInput) contextMenusInput.checked = options.contextMenus === true;
	if (batchProcessingEnabledInput) batchProcessingEnabledInput.checked = options.batchProcessingEnabled !== false;
	if (obsidianIntegrationInput) obsidianIntegrationInput.checked = options.obsidianIntegration === true;
	if (obsidianVaultInput) obsidianVaultInput.value = String(options.obsidianVault || '');
	if (obsidianFolderInput) obsidianFolderInput.value = String(options.obsidianFolder || '');
	if (sendToMaxUrlLengthInput) sendToMaxUrlLengthInput.value = String(options.sendToMaxUrlLength || '');

	// Set preserveCodeFormatting checkbox
	const preserveCodeFormattingInput = queryElementOfType("[name='preserveCodeFormatting']", HTMLInputElement);
	const autoDetectCodeLanguageInput = queryElementOfType("[name='autoDetectCodeLanguage']", HTMLInputElement);
	if (preserveCodeFormattingInput) preserveCodeFormattingInput.checked = options.preserveCodeFormatting === true;
	if (autoDetectCodeLanguageInput) autoDetectCodeLanguageInput.checked = options.autoDetectCodeLanguage === true;

	// Set table formatting checkboxes
	const tableFormatting = options.tableFormatting || {};
	const stripLinksInput = queryElementOfType("[name='tableFormatting.stripLinks']", HTMLInputElement);
	const stripFormattingInput = queryElementOfType("[name='tableFormatting.stripFormatting']", HTMLInputElement);
	const prettyPrintInput = queryElementOfType("[name='tableFormatting.prettyPrint']", HTMLInputElement);
	const centerTextInput = queryElementOfType("[name='tableFormatting.centerText']", HTMLInputElement);
	if (stripLinksInput) stripLinksInput.checked = Boolean(tableFormatting.stripLinks);
	if (stripFormattingInput) stripFormattingInput.checked = Boolean(tableFormatting.stripFormatting);
	if (prettyPrintInput) prettyPrintInput.checked = Boolean(tableFormatting.prettyPrint);
	if (centerTextInput) centerTextInput.checked = Boolean(tableFormatting.centerText);

	setCheckedValue(document.querySelectorAll("[name='headingStyle']"), options.headingStyle);
	setCheckedValue(document.querySelectorAll("[name='hr']"), options.hr);
	setCheckedValue(document.querySelectorAll("[name='bulletListMarker']"), options.bulletListMarker);
	setCheckedValue(document.querySelectorAll("[name='codeBlockStyle']"), options.codeBlockStyle);
	setCheckedValue(document.querySelectorAll("[name='fence']"), options.fence);
	setCheckedValue(document.querySelectorAll("[name='emDelimiter']"), options.emDelimiter);
	setCheckedValue(document.querySelectorAll("[name='strongDelimiter']"), options.strongDelimiter);
	setCheckedValue(document.querySelectorAll("[name='linkStyle']"), options.linkStyle);
	setCheckedValue(document.querySelectorAll("[name='linkReferenceStyle']"), options.linkReferenceStyle);
	setCheckedValue(document.querySelectorAll("[name='imageStyle']"), options.imageStyle);
	setCheckedValue(document.querySelectorAll("[name='imageRefStyle']"), options.imageRefStyle);
	setCheckedValue(document.querySelectorAll("[name='hashtagHandling']"), options.hashtagHandling || 'keep');
	setCheckedValue(document.querySelectorAll("[name='downloadMode']"), options.downloadMode);
	setCheckedValue(document.querySelectorAll("[name='defaultExportType']"), options.defaultExportType || 'markdown');
	renderDefaultSendToTargetOptions();
	renderAssistantTargetsList();

	setCheckedValue(document.querySelectorAll("[name='popupTheme']"), options.popupTheme || 'system');
	setCheckedValue(document.querySelectorAll("[name='specialTheme']"), options.specialTheme || 'none');
	const colorBlindThemeInput = queryElementOfType("[name='colorBlindTheme']", HTMLInputElement);
	const specialThemeIconInput = queryElementOfType("[name='specialThemeIcon']", HTMLInputElement);
	if (colorBlindThemeInput) colorBlindThemeInput.value = normalizeColorBlindTheme(options.colorBlindTheme);
	if (specialThemeIconInput) specialThemeIconInput.checked = options.specialThemeIcon !== false;
	setCheckedValue(document.querySelectorAll("[name='popupAccent']"), options.popupAccent || 'sage');
	const compactModeInput = queryElementOfType("[name='compactMode']", HTMLInputElement);
	const showThemeToggleInput = queryElementOfType("[name='showThemeToggleInPopup']", HTMLInputElement);
	const showUserGuideIconInput = queryElementOfType("[name='showUserGuideIcon']", HTMLInputElement);
	if (compactModeInput) compactModeInput.checked = options.compactMode === true;
	if (showThemeToggleInput) showThemeToggleInput.checked = options.showThemeToggleInPopup !== false;
	if (showUserGuideIconInput) showUserGuideIconInput.checked = options.showUserGuideIcon !== false;
	setCheckedValue(document.querySelectorAll("[name='editorTheme']"), options.editorTheme || 'default');

	updateSpecialThemeControlState();
	refreshElements();
	applyThemeSettings();
	renderSiteRules();
	renderTemplatePreviews();
};

const setCurrentLibraryChoice = (result) => {
	librarySettings = normalizeLibrarySettingsState(result);
	document.querySelector("[name='libraryEnabled']").checked = librarySettings.enabled;
	document.querySelector("[name='libraryAutoSaveOnPopupOpen']").checked = librarySettings.autoSaveOnPopupOpen;
	document.querySelector("[name='libraryItemsToKeep']").value = librarySettings.itemsToKeep;
	refreshElements();
};

const setCurrentAgentBridgeChoice = (settingsResult, statusResult = agentBridgeStatus) => {
	agentBridgeSettings = normalizeAgentBridgeSettingsState(settingsResult);
	agentBridgeStatus = normalizeAgentBridgeStatusState(statusResult);

	const toggle = document.querySelector("[name='agentBridgeEnabled']");
	if (toggle) {
		toggle.checked = agentBridgeSettings.enabled;
	}

	const container = document.getElementById('agent-bridge-container');
	const statusText = document.getElementById('agentBridgeStatusText');
	const statusHint = document.getElementById('agentBridgeStatusHint');
	const toggleHint = document.getElementById('agentBridgeToggleHint');
	const versionEl = document.getElementById('agentBridgeHostVersion');

	let text = 'Disabled';
	let hint = 'Enable the Agent Bridge to let SnipSnip connect to the local companion.';
	let state = 'disabled';

	if (usesOptionalNativeMessagingPermission() && agentBridgeSettings.enabled && !agentBridgeStatus.permissionGranted) {
		text = 'Permission needed';
		hint = 'Grant native messaging permission to let SnipSnip connect to the local companion.';
		state = 'permission-needed';
	} else if (agentBridgeSettings.enabled && agentBridgeStatus.connecting) {
		text = 'Checking connection';
		hint = 'SnipSnip is waiting for the local companion to respond.';
		state = 'starting';
	} else if (agentBridgeSettings.enabled && agentBridgeStatus.connected) {
		text = `Connected${agentBridgeStatus.browser ? ` via ${agentBridgeStatus.browser}` : ''}`;
		hint = 'The local CLI can request the current page while this browser is open.';
		state = 'connected';
	} else if (agentBridgeSettings.enabled && agentBridgeStatus.lastError) {
		text = 'Waiting for companion';
		hint = 'The local companion could not be reached. Check the setup guide and try again.';
		state = 'waiting';
	} else if (agentBridgeSettings.enabled) {
		text = 'Starting';
		hint = 'SnipSnip is trying to connect to the local companion.';
		state = 'starting';
	} else if (!agentBridgeSettings.enabled && agentBridgeStatus.permissionGranted) {
		// Disabled after prior grant
		hint =
			'SnipSnip will not use the local connection while disabled, even if the browser-level permission remains granted.';
	}

	if (container) {
		container.dataset.bridgeState = state;
	}
	updateAgentBridgeActionButton(state);

	if (statusText) {
		statusText.textContent = text;
	}
	if (statusHint) {
		statusHint.textContent = hint;
	}

	// Update toggle hint based on enabled state
	if (toggleHint) {
		if (agentBridgeSettings.enabled) {
			toggleHint.textContent = 'SnipSnip opens a native messaging connection while this toggle is on.';
		} else {
			toggleHint.textContent = 'When off, SnipSnip will not open a local companion connection.';
		}
	}

	if (versionEl) {
		if (agentBridgeStatus.hostVersion) {
			versionEl.textContent = `Host ${agentBridgeStatus.hostVersion}`;
			versionEl.hidden = false;
		} else {
			versionEl.textContent = '';
			versionEl.hidden = true;
		}
	}
};

const restoreOptions = () => {
	const onError = error => {
		console.error(error);
	};

	resolveAgentBridgeInstallCommand().catch(onError);

	Promise.all([
		getItemsBag('sync', defaultOptions),
		loadLibrarySettingsState(),
		loadAgentBridgeSettingsState(),
		loadAgentBridgeStatusState(),
	]).then(([syncOptions, localLibrarySettings, localAgentBridgeSettings, localAgentBridgeStatus]) => {
		setCurrentChoice(syncOptions);
		setCurrentLibraryChoice(localLibrarySettings);
		setCurrentAgentBridgeChoice(localAgentBridgeSettings, localAgentBridgeStatus);
		refreshAgentBridgeStatusState().then((status) => {
			setCurrentAgentBridgeChoice(agentBridgeSettings, status);
		}).catch(onError);
	}, onError);
};

const show = (el, visible) => {
	if (!el) return;
	el.style.display = visible ? '' : 'none';
	el.style.opacity = visible ? '1' : '0';
};

const refreshElements = () => {
	// Apply theme/accent to Options page live
	applyThemeSettings();
	updateSpecialThemeControlState();

	document.getElementById('downloadModeGroup').querySelectorAll('.setting-card').forEach(container => {
		show(container, options.downloadMode === 'downloadsApi');
	});

	show(document.getElementById('mdClipsFolder'), options.downloadMode === 'downloadsApi');

	show(document.getElementById('linkReferenceStyle'), options.linkStyle === 'referenced');

	show(
		document.getElementById('imageRefOptions'),
		!(options.imageStyle?.startsWith('obsidian')) && options.imageStyle !== 'noImage',
	);

	show(document.getElementById('fence'), options.codeBlockStyle === 'fenced');

	const downloadImages = options.downloadImages && options.downloadMode === 'downloadsApi';

	show(document.getElementById('imagePrefix'), downloadImages);

	document.getElementById('markdown').disabled = !downloadImages;
	document.getElementById('base64').disabled = !downloadImages;
	document.getElementById('obsidian').disabled = !downloadImages;
	document.getElementById('obsidian-nofolder').disabled = !downloadImages;

	show(document.getElementById('defaultSendToTargetCard'), options.defaultExportType === 'sendTo');

	show(document.getElementById('libraryAutoSave-container'), librarySettings.enabled);
	show(document.getElementById('libraryItemsToKeep-container'), librarySettings.enabled);
};

const inputChange = async (e) => {
	if (e) {
		const key = e.target.name;
		let value = e.target.value;
		if (key === 'import-file') {
			fr = new FileReader();
			fr.onload = async (ev) => {
				const lines = ev.target.result;
				const importedPayload = JSON.parse(lines);
				const importedLibrarySettings = importedPayload?.librarySettings;
				const importedOptions = { ...importedPayload };
				delete importedOptions.librarySettings;
				delete importedOptions.libraryItems;
				const previousOptions = options;
				options = normalizeImportedOptionsState(importedOptions);
				setCurrentChoice(options);
				applyContextMenuTransition(getContextMenuTransitionState(previousOptions, options));
				if (importedLibrarySettings) {
					await saveLibrarySettingsState(importedLibrarySettings);
					setCurrentLibraryChoice(librarySettings);
				}
				save();
				refreshElements();
			};
			fr.readAsText(e.target.files[0]);
		} else if (key === 'libraryEnabled' || key === 'libraryAutoSaveOnPopupOpen' || key === 'libraryItemsToKeep') {
			if (e.target.type === 'checkbox') value = e.target.checked;

			if (key === 'libraryEnabled') {
				librarySettings.enabled = Boolean(value);
			} else if (key === 'libraryAutoSaveOnPopupOpen') {
				librarySettings.autoSaveOnPopupOpen = Boolean(value);
			} else if (key === 'libraryItemsToKeep') {
				librarySettings.itemsToKeep = normalizeLibrarySettingsState({
					...librarySettings,
					itemsToKeep: value,
				}).itemsToKeep;
				document.querySelector("[name='libraryItemsToKeep']").value = librarySettings.itemsToKeep;
				await trimLibraryItemsState(librarySettings.itemsToKeep);
			}

			await saveLibrarySettingsState(librarySettings);
			setCurrentLibraryChoice(librarySettings);
			showToast('Library settings saved', 'success');
		} else if (key === 'agentBridgeEnabled') {
			const nextEnabled = Boolean(e.target.checked);
			const reloadRequired = false;

			if (nextEnabled && usesOptionalNativeMessagingPermission() && !agentBridgeStatus.permissionGranted) {
				// Don't immediately request permission — show the preflight panel
				e.target.checked = false;
				showPermissionPanel('preflight');
				return;
			}

			agentBridgeSettings.enabled = nextEnabled;
			hidePermissionPanel();
			await saveAgentBridgeSettingsState(agentBridgeSettings);
			if (reloadRequired) {
				await reloadExtensionForAgentBridgePermissionGrant();
				return;
			}
			const refreshedStatus = await refreshAgentBridgeStatusState();
			setCurrentAgentBridgeChoice(agentBridgeSettings, refreshedStatus);
			showToast(nextEnabled ? 'Agent Bridge enabled' : 'Agent Bridge disabled', 'success');
		} else {
			if (e.target.type === 'checkbox') value = e.target.checked;
			if (key === 'sendToMaxUrlLength') {
				value = normalizeSendToMaxUrlLengthState(value, defaultOptions?.sendToMaxUrlLength);
				e.target.value = value;
			}

			// Handle nested table formatting options
			if (key.startsWith('tableFormatting.')) {
				const optionName = key.split('.')[1];
				options.tableFormatting = options.tableFormatting || {};
				options.tableFormatting[optionName] = value;
			} else {
				options[key] = value;
			}

			if (key === 'contextMenus') {
				if (value) createMenus();
				else browser.contextMenus.removeAll();
			}

			save();
			refreshElements();
		}
	}
};

const inputKeyup = (e) => {
	if (keyupTimeout) clearTimeout(keyupTimeout);
	keyupTimeout = setTimeout(inputChange, 500, e);
};

const buttonClick = async (e) => {
	if (e.target.id === 'import' || e.target.closest('#import')) {
		document.getElementById('import-file').click();
	} else if (e.target.id === 'export' || e.target.closest('#export')) {
		console.log('export');
		const json = JSON.stringify(buildExportPayload(), null, 2);
		const blob = new Blob([json], { type: 'text/json' });
		const url = URL.createObjectURL(blob);
		browser.downloads.download({
			url: url,
			saveAs: true,
			filename: buildExportFilenameState(new Date()),
		});
	} else if (e.target.id === 'clear-library' || e.target.closest('#clear-library')) {
		clearLibraryItems();
	} else if (e.target.id === 'refreshAgentBridgeStatus' || e.target.closest('#refreshAgentBridgeStatus')) {
		const refreshBtn = document.getElementById('refreshAgentBridgeStatus');
		const needsPermission = usesOptionalNativeMessagingPermission() && agentBridgeSettings.enabled
			&& !agentBridgeStatus.permissionGranted;

		if (needsPermission) {
			if (refreshBtn) {
				refreshBtn.disabled = true;
				refreshBtn.textContent = 'Granting...';
			}

			try {
				const permissionResult = await requestAgentBridgePermission();
				if (!permissionResult.granted) {
					setCurrentAgentBridgeChoice(agentBridgeSettings, agentBridgeStatus);
					return;
				}

				if (permissionResult.reloadRequired) {
					await reloadExtensionForAgentBridgePermissionGrant();
					return;
				}

				const status = await refreshAgentBridgeStatusState();
				setCurrentAgentBridgeChoice(agentBridgeSettings, status);
				showToast('Agent Bridge permission granted', 'success');
			} catch (error) {
				console.error('Failed to request Agent Bridge permission:', error);
				setCurrentAgentBridgeChoice(agentBridgeSettings, agentBridgeStatus);
				showToast(String(error), 'error');
			} finally {
				if (refreshBtn) {
					refreshBtn.disabled = false;
				}
				updateAgentBridgeActionButton(
					document.getElementById('agent-bridge-container')?.dataset.bridgeState || 'disabled',
				);
			}
			return;
		}

		if (refreshBtn) {
			refreshBtn.disabled = true;
			refreshBtn.textContent = 'Checking...';
		}
		setCurrentAgentBridgeChoice(agentBridgeSettings, {
			...agentBridgeStatus,
			connecting: true,
			connected: false,
			lastError: '',
		});

		refreshAgentBridgeStatusState()
			.then((status) => {
				setCurrentAgentBridgeChoice(agentBridgeSettings, status);
				showToast('Agent Bridge status refreshed', 'success');
			})
			.catch((error) => {
				console.error('Failed to refresh Agent Bridge status:', error);
				setCurrentAgentBridgeChoice(agentBridgeSettings, agentBridgeStatus);
				showToast(String(error), 'error');
			})
			.finally(() => {
				if (refreshBtn) {
					refreshBtn.disabled = false;
				}
				updateAgentBridgeActionButton(
					document.getElementById('agent-bridge-container')?.dataset.bridgeState || 'disabled',
				);
			});
	} else if (e.target.id === 'copyAgentBridgeCommand' || e.target.closest('#copyAgentBridgeCommand')) {
		const command = document.getElementById('agentBridgeInstallCommand')?.textContent?.trim()
			|| agentBridgeInstallCommand;
		navigator.clipboard.writeText(command)
			.then(() => {
				showToast('Install command copied', 'success');
			})
			.catch((error) => {
				console.error('Failed to copy Agent Bridge install command:', error);
				showToast('Failed to copy install command', 'error');
			});
	}
};

// ── Sidebar Navigation ──
async function clearLibraryItems() {
	if (!confirm('Delete all saved Library clips from this browser? This cannot be undone.')) {
		return;
	}

	try {
		await clearLibraryItemsState();
		showToast('Library cleared', 'success');
	} catch (error) {
		console.error('Failed to clear library:', error);
		showToast(String(error), 'error');
	}
}

function initSidebar() {
	const sidebarItems = Array.from(document.querySelectorAll('.sidebar-item'));
	const sections = Array.from(document.querySelectorAll('.section'));

	// Restore last active tab from sessionStorage
	const lastActive = sessionStorage.getItem('snipsnip-options-tab') || 'templates';

	function switchSection(sectionId) {
		// Update sidebar
		sidebarItems.forEach(item => {
			const isActive = item.dataset.section === sectionId;
			item.classList.toggle('active', isActive);
			item.setAttribute('aria-selected', String(isActive));
			item.tabIndex = isActive ? 0 : -1;
		});
		const activeItem = document.querySelector(`.sidebar-item[data-section="${sectionId}"]`);

		// Update sections
		sections.forEach(section => {
			const isActive = section.id === `section-${sectionId}`;
			section.classList.toggle('active', isActive);
			section.setAttribute('aria-hidden', String(!isActive));
		});
		const activeSection = document.getElementById(`section-${sectionId}`);

		// Persist
		sessionStorage.setItem('snipsnip-options-tab', sectionId);

		return { activeItem, activeSection };
	}

	function activateSidebarItem(item, shouldFocus = false) {
		if (!item) {
			return;
		}

		const searchInput = document.getElementById('settings-search');
		if (searchInput?.value) {
			searchInput.value = '';
			searchInput.dispatchEvent(new Event('input'));
		}

		const { activeItem } = switchSection(item.dataset.section);
		if (shouldFocus && activeItem) {
			activeItem.focus();
		}
	}

	sidebarItems.forEach(item => {
		item.addEventListener('click', () => {
			activateSidebarItem(item);
		});

		item.addEventListener('keydown', (event) => {
			const currentIndex = sidebarItems.indexOf(item);
			let targetIndex = currentIndex;

			if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
				targetIndex = (currentIndex + 1) % sidebarItems.length;
			} else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
				targetIndex = (currentIndex - 1 + sidebarItems.length) % sidebarItems.length;
			} else if (event.key === 'Home') {
				targetIndex = 0;
			} else if (event.key === 'End') {
				targetIndex = sidebarItems.length - 1;
			} else if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				activateSidebarItem(item);
				return;
			} else {
				return;
			}

			event.preventDefault();
			activateSidebarItem(sidebarItems[targetIndex], true);
		});
	});

	// Initialize to last active
	switchSection(lastActive);
}

// ── Per-card and global reset ──

function injectResetLinks() {
	document.querySelectorAll('.setting-card[data-setting-key], .setting-card[data-local-setting-key]').forEach(card => {
		// Skip if already injected
		if (card.querySelector('.reset-setting-link')) return;

		const resetBtn = document.createElement('button');
		resetBtn.type = 'button';
		resetBtn.className = 'reset-setting-link';
		resetBtn.textContent = 'Reset';
		resetBtn.title = 'Reset to default';

		// If card has a card-title, wrap title + reset in a row
		const titleEl = card.querySelector(':scope > .card-title');
		if (titleEl) {
			const row = document.createElement('div');
			row.className = 'card-title-row';
			titleEl.before(row);
			row.appendChild(titleEl);
			row.appendChild(resetBtn);
		} else {
			// For toggle-only cards, insert as first child (positioned absolutely via CSS)
			card.insertBefore(resetBtn, card.firstChild);
		}

		resetBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			resetSettingByCard(card);
		});
	});
}

async function resetSettingByCard(card) {
	const localKey = card.dataset.localSettingKey;

	if (localKey) {
		const defaults = normalizeLibrarySettingsState();
		librarySettings = {
			...librarySettings,
			[localKey]: defaults[localKey],
		};
		if (localKey === 'itemsToKeep') {
			await trimLibraryItemsState(librarySettings.itemsToKeep);
		}
		await saveLibrarySettingsState(librarySettings);
		setCurrentLibraryChoice(librarySettings);
		showToast('Setting reset to default', 'success');
		return;
	}

	const keys = card.dataset.settingKey.split(',');
	const resetResult = resetOptionKeysState(keys);
	options = resetResult.options;
	setCurrentChoice(options);
	applyContextMenuTransition(resetResult.contextMenuAction);
	save();
	showToast('Setting reset to default', 'success');
}

async function resetAllSettings() {
	if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;
	const resetResult = resetAllOptionsState();
	options = resetResult.options;
	setCurrentChoice(options);
	applyContextMenuTransition(resetResult.contextMenuAction);
	await resetLibrarySettingsState();
	setCurrentLibraryChoice(librarySettings);
	save();
	showToast('All settings reset to defaults', 'success');
}

const loaded = () => {
	// Initialize sidebar navigation
	initSidebar();
	initSearch();
	configureReviewLink();
	bindTemplatePreviewListeners();
	renderTemplatePreviews();
	initSendToControls();

	// Restore saved options
	restoreOptions();
	initSiteRuleControls();

	browser.storage.onChanged?.addListener?.((changes, areaName) => {
		if (areaName !== 'local') {
			return;
		}

		const bridgeApi = getAgentBridgeStateApi();
		const settingsKey = bridgeApi?.STORAGE_KEYS?.SETTINGS;
		const statusKey = bridgeApi?.STORAGE_KEYS?.STATUS;

		if (settingsKey && changes[settingsKey]) {
			agentBridgeSettings = normalizeAgentBridgeSettingsState(changes[settingsKey].newValue);
			setCurrentAgentBridgeChoice(agentBridgeSettings, agentBridgeStatus);
		}

		if (statusKey && changes[statusKey]) {
			agentBridgeStatus = normalizeAgentBridgeStatusState(changes[statusKey].newValue);
			setCurrentAgentBridgeChoice(agentBridgeSettings, agentBridgeStatus);
		}
	});

	// Inject per-card reset links
	injectResetLinks();

	// Reset All button
	const resetAllBtn = document.getElementById('reset-all');
	if (resetAllBtn) {
		resetAllBtn.addEventListener('click', resetAllSettings);
	}

	// Attach event listeners (skip the search input)
	document.querySelectorAll('input,textarea,button,select').forEach(input => {
		if (input.id === 'settings-search') return;
		if (input.closest('#siteRulesCard')) return;
		if (input.closest('#defaultSendToTargetCard') || input.closest('#assistantTargetsCard')) return;
		// Skip permission panel buttons (they have their own handlers)
		if (
			['agentBridgePermContinue', 'agentBridgePermCancel', 'agentBridgePermRetry', 'agentBridgePermDismiss'].includes(
				input.id,
			)
		) return;
		// Skip colorblind theme dropdown (has its own handlers)
		if (input.id === 'colorBlindThemeBtn' || input.closest('#colorBlindThemePanel')) return;
		if (input.tagName === 'TEXTAREA' || input.type === 'text') {
			input.addEventListener('keyup', inputKeyup);
		} else if (input.type === 'number') {
			input.addEventListener('keyup', inputKeyup);
			input.addEventListener('change', inputChange);
		} else if (input.tagName === 'BUTTON') {
			input.addEventListener('click', buttonClick);
		} else input.addEventListener('change', inputChange);
	});

	// Colorblind theme custom dropdown
	document.getElementById('colorBlindThemeBtn')?.addEventListener('click', toggleCbDropdown);
	document.getElementById('colorBlindThemePanel')?.addEventListener('click', (e) => {
		const item = e.target.closest('.dd-item[data-value]');
		if (!item) return;
		const value = item.dataset.value;
		const hiddenInput = document.querySelector("[name='colorBlindTheme']");
		if (hiddenInput) hiddenInput.value = value;
		options.colorBlindTheme = value;
		closeCbDropdown();
		save();
		refreshElements();
	});
	document.addEventListener('click', (e) => {
		if (!document.getElementById('colorBlindDropdownWrap')?.contains(e.target)) {
			closeCbDropdown();
		}
	});
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') closeCbDropdown();
	});

	// Wire up permission panel buttons
	const permContinue = document.getElementById('agentBridgePermContinue');
	const permCancel = document.getElementById('agentBridgePermCancel');
	const permRetry = document.getElementById('agentBridgePermRetry');
	const permDismiss = document.getElementById('agentBridgePermDismiss');
	const permGuideLink = document.getElementById('agentBridgePermGuideLink');

	if (permContinue) permContinue.addEventListener('click', handlePermissionContinue);
	if (permCancel) permCancel.addEventListener('click', handlePermissionCancel);
	if (permRetry) permRetry.addEventListener('click', handlePermissionRetry);
	if (permDismiss) permDismiss.addEventListener('click', handlePermissionDismiss);
	if (permGuideLink) {
		permGuideLink.addEventListener('click', (e) => {
			e.preventDefault();
			const setupGuide = document.getElementById('agentBridgeSetupGuide');
			if (setupGuide) {
				setupGuide.open = true;
				setupGuide.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			}
		});
	}
};

// ── Settings Search ──
function initSearch() {
	const searchInput = document.getElementById('settings-search');
	const searchStatus = document.getElementById('settings-search-status');
	const contentPanel = document.querySelector('.content-panel');
	const noResults = document.getElementById('search-no-results');
	const noResultsQuery = document.getElementById('search-no-results-query');
	const searchApi = globalThis.snipSnipOptionsSearch;

	if (!searchInput || !contentPanel || !noResults || !noResultsQuery || !searchApi) {
		return;
	}

	const sections = document.querySelectorAll('.section');
	const searchIndex = searchApi.buildSearchIndex(document);
	const totalSettings = searchIndex.length;
	let searchTimeout = null;

	function updateSearchStatus(message) {
		if (!searchStatus) {
			return;
		}
		const nextMessage = String(message || '');
		searchStatus.textContent = nextMessage;
		searchStatus.hidden = nextMessage === '';
	}

	function restoreDefaultView() {
		contentPanel.classList.remove('search-active');
		noResults.classList.remove('visible');
		updateSearchStatus('');

		searchIndex.forEach(({ card }) => {
			card.classList.remove('search-hidden', 'search-match');
			card.style.removeProperty('display');
			card.style.removeProperty('opacity');
			delete card.dataset.searchBreadcrumb;
			delete card.dataset.searchAlias;
		});

		document.querySelectorAll('[data-search-force-shown]').forEach(el => {
			el.style.removeProperty('display');
			el.style.removeProperty('opacity');
			el.removeAttribute('data-search-force-shown');
		});

		sections.forEach((section) => {
			section.classList.remove('search-section-empty');
		});

		const activeTab = sessionStorage.getItem('snipsnip-options-tab') || 'templates';
		const sidebarItems = document.querySelectorAll('.sidebar-item');
		const allSections = document.querySelectorAll('.section');

		sidebarItems.forEach(item => {
			const isActive = item.dataset.section === activeTab;
			item.classList.toggle('active', isActive);
			item.setAttribute('aria-selected', String(isActive));
			item.tabIndex = isActive ? 0 : -1;
		});
		const _activeItem = document.querySelector(`.sidebar-item[data-section="${activeTab}"]`);

		allSections.forEach(section => {
			const isActive = section.id === `section-${activeTab}`;
			section.classList.toggle('active', isActive);
			section.setAttribute('aria-hidden', String(!isActive));
		});
		const _activeSection = document.getElementById(`section-${activeTab}`);

		refreshElements();
	}

	function performSearch(query) {
		const normalizedQuery = searchApi.normalizeSearchText(query);

		if (!normalizedQuery) {
			restoreDefaultView();
			return;
		}

		contentPanel.classList.add('search-active');

		const searchResults = searchApi.searchSettings(searchIndex, normalizedQuery);
		let totalMatches = 0;

		searchResults.results.forEach(({ card, section, matches, tokenMatches }) => {
			card.classList.toggle('search-hidden', !matches);
			card.classList.toggle('search-match', matches);

			// Always clear previous annotations so stale data doesn't linger on non-matches
			delete card.dataset.searchBreadcrumb;
			delete card.dataset.searchAlias;

			if (matches) {
				totalMatches++;
				card.style.display = '';
				card.style.opacity = '1';

				// Force-show any conditionally hidden children so they are interactable in search results
				card.querySelectorAll('[data-search-reveal]').forEach(child => {
					if (child.style.display === 'none') {
						child.style.display = '';
						child.style.opacity = '1';
						child.setAttribute('data-search-force-shown', '');
					}
				});

				const sectionLabel = section.querySelector('.section-title')?.textContent?.trim()
					|| section.dataset.sectionLabel || '';
				const cardTitle = card.querySelector('.card-title')?.textContent?.trim() || '';
				if (sectionLabel) {
					card.dataset.searchBreadcrumb = sectionLabel + (cardTitle ? ` \u203a ${cardTitle}` : '');
				}

				const aliasSources = tokenMatches.filter(m => m.fieldSource === 'alias');
				if (aliasSources.length > 0) {
					const rawKeywords = card.dataset.searchKeywords || '';
					const keywords = rawKeywords.split(',').map(k => k.trim()).filter(Boolean);
					const matchedKeywords = keywords.filter(kw => {
						const normKw = searchApi.normalizeSearchText(kw);
						return aliasSources.some(m => normKw.includes(m.token) || normKw.startsWith(m.token));
					});
					if (matchedKeywords.length > 0) {
						card.dataset.searchAlias = `matched via: ${matchedKeywords.slice(0, 2).join(', ')}`;
					}
				}

				let parent = card.parentElement;
				while (parent && parent !== contentPanel) {
					if (parent.style.display === 'none') {
						parent.style.display = '';
						parent.style.opacity = '1';
						parent.setAttribute('data-search-force-shown', '');
					}
					parent = parent.parentElement;
				}
			}
		});

		sections.forEach(section => {
			const hasVisible = section.querySelector('.setting-card.search-match');
			section.classList.toggle('search-section-empty', !hasVisible);
			section.setAttribute('aria-hidden', String(!hasVisible));
		});

		if (totalMatches === 0) {
			noResultsQuery.textContent = query.trim();
			noResults.classList.add('visible');
			updateSearchStatus(`No settings match "${query.trim()}"`);
		} else {
			noResults.classList.remove('visible');
			updateSearchStatus(`Showing ${totalMatches} of ${totalSettings} settings`);
		}
	}

	searchInput.addEventListener('input', () => {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => performSearch(searchInput.value), 150);
	});

	document.addEventListener('keydown', (e) => {
		if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
			const tag = document.activeElement?.tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
			e.preventDefault();
			searchInput.focus();
		}

		if (e.key === 'Escape' && document.activeElement === searchInput) {
			searchInput.value = '';
			performSearch('');
			searchInput.blur();
		}
	});
}

function _initSearchLegacy() {
	const searchInput = document.getElementById('settings-search');
	const contentPanel = document.querySelector('.content-panel');
	const noResults = document.getElementById('search-no-results');
	const noResultsQuery = document.getElementById('search-no-results-query');
	const _shortcutHint = document.getElementById('search-shortcut-hint');

	// Build search index: collect all setting-cards with their searchable text
	// Also include the downloadModeGroup's inner cards as individual entries
	const sections = document.querySelectorAll('.section');
	const searchIndex = [];

	sections.forEach(section => {
		// Get direct setting-cards and also cards inside #downloadModeGroup
		const cards = section.querySelectorAll('.setting-card');
		cards.forEach(card => {
			const text = card.textContent.toLowerCase();
			searchIndex.push({ card, section, text });
		});
	});

	let searchTimeout = null;

	function performSearch(query) {
		query = query.trim().toLowerCase();

		if (!query) {
			// Exit search mode — restore normal sidebar navigation
			contentPanel.classList.remove('search-active');
			noResults.classList.remove('visible');
			searchIndex.forEach(({ card }) => {
				card.classList.remove('search-hidden', 'search-match');
				card.style.removeProperty('display');
				card.style.removeProperty('opacity');
			});
			// Also restore parent wrappers that may have been force-shown
			document.querySelectorAll('[data-search-force-shown]').forEach(el => {
				el.removeAttribute('data-search-force-shown');
			});
			sections.forEach((section) => {
				section.classList.remove('search-section-empty');
			});
			// Re-trigger sidebar to show correct section
			const activeTab = sessionStorage.getItem('snipsnip-options-tab') || 'templates';
			const sidebarItems = document.querySelectorAll('.sidebar-item');
			const allSections = document.querySelectorAll('.section');
			sidebarItems.forEach((item) => {
				item.classList.remove('active');
			});
			const activeItem = document.querySelector(`.sidebar-item[data-section="${activeTab}"]`);
			if (activeItem) activeItem.classList.add('active');
			allSections.forEach((section) => {
				section.classList.remove('active');
			});
			const activeSection = document.getElementById(`section-${activeTab}`);
			if (activeSection) activeSection.classList.add('active');
			// Restore conditional visibility
			refreshElements();
			return;
		}

		// Enter search mode
		contentPanel.classList.add('search-active');

		const terms = query.split(/\s+/).filter(Boolean);
		let totalMatches = 0;

		searchIndex.forEach(({ card, text }) => {
			const matches = terms.every(term => text.includes(term));
			card.classList.toggle('search-hidden', !matches);
			card.classList.toggle('search-match', matches);
			if (matches) {
				totalMatches++;
				// Override any inline display:none from show() / refreshElements()
				card.style.display = '';
				card.style.opacity = '1';
				// Force-show any conditionally hidden children so they are interactable in search results
				card.querySelectorAll('[data-search-reveal]').forEach(child => {
					if (child.style.display === 'none') {
						child.style.display = '';
						child.style.opacity = '1';
						child.setAttribute('data-search-force-shown', '');
					}
				});
				// Also ensure parent wrappers (like #downloadModeGroup) are visible
				let parent = card.parentElement;
				while (parent && parent !== contentPanel) {
					if (parent.style.display === 'none') {
						parent.style.display = '';
						parent.style.opacity = '1';
						parent.setAttribute('data-search-force-shown', '');
					}
					parent = parent.parentElement;
				}
			}
		});

		// Mark sections that have zero visible cards
		sections.forEach(section => {
			const hasVisible = section.querySelector('.setting-card.search-match');
			section.classList.toggle('search-section-empty', !hasVisible);
		});

		// Show/hide no-results message
		if (totalMatches === 0) {
			noResultsQuery.textContent = query;
			noResults.classList.add('visible');
		} else {
			noResults.classList.remove('visible');
		}
	}

	searchInput.addEventListener('input', () => {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => performSearch(searchInput.value), 150);
	});

	// "/" keyboard shortcut to focus search
	document.addEventListener('keydown', (e) => {
		if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
			const tag = document.activeElement?.tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
			e.preventDefault();
			searchInput.focus();
		}
		// Escape to clear search
		if (e.key === 'Escape' && document.activeElement === searchInput) {
			searchInput.value = '';
			performSearch('');
			searchInput.blur();
		}
	});
}

document.addEventListener('DOMContentLoaded', loaded);
document.getElementById('status').addEventListener('click', hideToast);

/// https://www.somacon.com/p143.php
// return the value of the radio button that is checked
// return an empty string if none are checked, or
// there are no radio buttons
function getCheckedValue(radioObj) {
	if (!radioObj) {
		return '';
	}
	const radioLength = radioObj.length;
	if (radioLength === undefined) {
		if (radioObj.checked) {
			return radioObj.value;
		} else {
			return '';
		}
	}
	for (let i = 0; i < radioLength; i++) {
		if (radioObj[i].checked) {
			return radioObj[i].value;
		}
	}
	return '';
}

// set the radio button with the given value as being checked
// do nothing if there are no radio buttons
// if the given value does not exist, all the radio buttons
// are reset to unchecked
function setCheckedValue(radioObj, newValue) {
	if (!radioObj) {
		return;
	}
	const radioLength = radioObj.length;
	if (radioLength === undefined) {
		radioObj.checked = radioObj.value === newValue.toString();
		return;
	}
	for (let i = 0; i < radioLength; i++) {
		radioObj[i].checked = false;
		if (radioObj[i].value === newValue.toString()) {
			radioObj[i].checked = true;
		}
	}
}
