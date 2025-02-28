import { InjectionToken } from '@angular/core';
import { FilePreviewDialogConfig } from './file-preview-overlay.types';
import { FilePreviewDialog } from './file-preview-overlay.types';

export const FILE_PREVIEW_DIALOG_DATA = new InjectionToken<FilePreviewDialog>('FILE_PREVIEW_DIALOG_DATA');

export const DEFAULT_CONFIG: FilePreviewDialogConfig = {
    hasBackdrop  : true,
    backdropClass: 'dark-backdrop',
    panelClass   : 'tm-file-preview-dialog-panel',
};