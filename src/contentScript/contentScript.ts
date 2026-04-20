import '@/contentScript/types.ts';
import { initCaptureContentScript } from '@/contentScript/capture.ts';
import { initLinkPickerContentScript } from '@/contentScript/linkPicker.ts';

initCaptureContentScript();
initLinkPickerContentScript();
