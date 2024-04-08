import { AsyncPipe, DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, ElementRef, ViewChild, ViewEncapsulation, WritableSignal, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MailboxService } from '../mailbox.service';
import { Observable, lastValueFrom, takeUntil } from 'rxjs';
import { InboxService } from '@apps/message/inbox';
import { MessageInbox } from '@apps/message/message.types';
import { Action, BreadcrumbComponent, ColumnConfig, ColumnDataType, Crumb, GridData, GridFiltersStorageService, GridState, GridStateService, QueryStatementHandler, TitleComponent, ViewBaseComponent } from '@aurora';
import { MessageCenterService } from '../message-center.service';
import { TranslocoModule } from '@ngneat/transloco';

export const messageCenterMainListId = 'message::messageCenter.list.mainList';
export const messageCenterPaginationListAction = 'message::messageCenter.list.pagination';
export const messageCenterExportListAction = 'message::messageCenter.list.export';
export const messageCustomerCenterMessage = 'message::customerCenterMessage';

@Component({
    selector     : 'au-message-center-list',
    templateUrl  : './message-center-list.component.html',
    encapsulation: ViewEncapsulation.None,
    standalone   : true,
    imports      : [
        AsyncPipe, BreadcrumbComponent, NgIf, MatButtonModule, MatIconModule, RouterLink, MatProgressBarModule,
        NgFor, NgClass, RouterOutlet, DatePipe, TitleComponent, TranslocoModule,
    ],
})
export class MessageCenterListComponent extends ViewBaseComponent
{
    // ---- customizations ----
    limit = 2;
    currentPage: WritableSignal<number> = signal(0);
    messages: WritableSignal<MessageInbox[]> = signal([]);
    countMessages: WritableSignal<number> = signal(0);
    totalMessages: WritableSignal<number> = signal(0);
    firstMessageOfPage = computed(() => (this.currentPage() * this.limit) + 1);
    lastMessageOfPage = computed(() => (this.currentPage() * this.limit) + this.limit > this.totalMessages() ? this.totalMessages() : (this.currentPage() * this.limit) + this.limit);
    previousOffset = computed(() => (this.currentPage() - 1) * this.limit);
    nextOffset = computed(() => (this.currentPage() * this.limit) + this.limit);
    selectedMessage: WritableSignal<MessageInbox> = signal(null);

    breadcrumb: Crumb[] = [
        { translation: 'App', routerLink: ['/']},
        { translation: 'message.MessageCenter' },
    ];
    gridData$: Observable<GridData<MessageInbox>>;
    gridState: GridState = {};
    columnsConfig$: Observable<ColumnConfig[]>;
    originColumnsConfig: ColumnConfig[] = [
        {
            type       : ColumnDataType.STRING,
            field      : 'id',
            sort       : 'id',
            translation: 'Id',
        },
        {
            type       : ColumnDataType.STRING,
            field      : 'subject',
            sort       : 'subject',
            translation: 'Subject',
        },
    ];


    // OLD
    @ViewChild('mailList') mailList: ElementRef;
    mailsLoading: boolean = false;


    /**
     * Constructor
     */
    constructor(
        private readonly _mailboxService: MailboxService,
        private readonly messageCenterService: MessageCenterService,
        private readonly gridStateService: GridStateService,
        private readonly gridFiltersStorageService: GridFiltersStorageService,
        private readonly inboxService: InboxService,
    )
    {
        super();
    }

    /**
     * On init
     */
    init(): void
    {
        // Subscribe to message changes
        this.inboxService.getScopePagination(messageCustomerCenterMessage)
            .pipe(takeUntil(this.unsubscribeAll$))
            .subscribe(inboxCustomerPagination =>
            {
                this.messages.set(inboxCustomerPagination.rows);
                this.countMessages.set(inboxCustomerPagination.count);
                this.totalMessages.set(inboxCustomerPagination.total);
            });

        // Selected message
        this.messageCenterService.selectedMessage$
            .pipe(takeUntil(this.unsubscribeAll$))
            .subscribe((selectedMessage: MessageInbox) =>
            {
                console.log('selectedMessage', selectedMessage);
                this.selectedMessage.set(selectedMessage);
            });


        // Mails loading
        this._mailboxService.mailsLoading$
            .pipe(takeUntil(this.unsubscribeAll$))
            .subscribe((mailsLoading: boolean) =>
            {
                this.mailsLoading = mailsLoading;

                // If the mail list element is available & the mails are loaded...
                if ( this.mailList && !mailsLoading )
                {
                    // Reset the mail list element scroll position to top
                    this.mailList.nativeElement.scrollTo(0, 0);
                }
            });
    }

    async handleAction(action: Action): Promise<void>
    {
        // add optional chaining (?.) to avoid first call where behaviour subject is undefined
        switch (action?.id)
        {
            case 'message::messageCenter.list.view':
                this.gridData$ = this.inboxService.getScopePagination(messageCustomerCenterMessage);
                break;

            case 'message::messageCenter.list.pagination':
                this.currentPage.set(action.meta.query.offset / this.limit);

                await lastValueFrom(
                    this.inboxService.paginateCustomerCenterMessagesInbox({
                        query: action.meta.query ?
                            action.meta.query :
                            QueryStatementHandler
                                .init({ columnsConfig: this.originColumnsConfig })
                                .setColumFilters(this.gridFiltersStorageService.getColumnFilterState(messageCenterMainListId))
                                .setSort(this.gridStateService.getSort(messageCenterMainListId))
                                .setPage(this.gridStateService.getPage(messageCenterMainListId))
                                .setSearch(this.gridStateService.getSearchState(messageCenterMainListId))
                                .getQueryStatement(),
                    }),
                );
                break;
        }
    }
}
