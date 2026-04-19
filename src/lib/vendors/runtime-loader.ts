export interface VendorRuntimeLoaderOptions<T> {
	cacheKey: string;
	label: string;
	getValue: () => T | undefined;
	setValue: (value: T) => void;
	importModule: () => Promise<unknown>;
	resolveModule: (loadedModule: unknown) => T | undefined;
}

const pendingVendorLoads = new Map<string, Promise<void>>();

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function isFunction(value: unknown): value is (...args: never[]) => unknown {
	return typeof value === 'function';
}

export function getModuleDefaultExport(loadedModule: unknown): unknown {
	if (!isRecord(loadedModule)) {
		return undefined;
	}

	return loadedModule.default;
}

export function getObjectProperty(value: unknown, propertyName: string): unknown {
	if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
		return undefined;
	}

	return Reflect.get(value, propertyName);
}

export async function loadVendorRuntime<T>(options: VendorRuntimeLoaderOptions<T>): Promise<T> {
	const existingValue = options.getValue();
	if (existingValue) {
		return existingValue;
	}

	let pendingLoad = pendingVendorLoads.get(options.cacheKey);
	if (!pendingLoad) {
		pendingLoad = (async () => {
			const loadedModule = await options.importModule();
			const currentValue = options.getValue();
			if (currentValue) {
				return;
			}

			const resolvedValue = options.resolveModule(loadedModule);
			if (resolvedValue) {
				options.setValue(resolvedValue);
			}
		})().finally(() => {
			pendingVendorLoads.delete(options.cacheKey);
		});
		pendingVendorLoads.set(options.cacheKey, pendingLoad);
	}

	await pendingLoad;

	const loadedValue = options.getValue();
	if (!loadedValue) {
		throw new Error(`${options.label} runtime unavailable after load.`);
	}

	return loadedValue;
}
