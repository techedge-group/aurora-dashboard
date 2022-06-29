import { ColumnConfig, ColumnDataType, FilterCriteriaOperator, FilterDialogResponse, GridColumnFilter, GridOperatorsMessages } from '../grid.types';
import { Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Operator, Utils } from '@aurora';
import { GridTranslationsService } from '../grid-translations/grid-translations.service';
import { map, Observable, startWith } from 'rxjs';

@Component({
    selector   : 'au-grid-filter-dialog',
    templateUrl: 'grid-filter-dialog.component.html',
    styleUrls  : ['grid-filter-dialog.component.scss'],
})
export class GridFilterDialogComponent implements OnInit
{
    columnsConfig: ColumnConfig[] = [];
    // form control picking for fields search from autocomplete
    searchFieldNameControl = new FormControl();
    // columns filtered by autocomplete
    filteredColumnsConfig: Observable<ColumnConfig[]>;
    // operator translations
    operatorsMessages: Observable<GridOperatorsMessages>;
    // data type can be a column
    columnDataType = ColumnDataType;
    // form filters components
    containerForm: FormGroup;
    // create getter to form array
    get formColumnFilter(): FormArray
    {
        return this.containerForm.get('formColumnFilter') as FormArray;
    }
    get arrayColumnFilters(): GridColumnFilter[]
    {
        return this.formColumnFilter.value as GridColumnFilter[];
    }

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: any,
        private _dialogRef: MatDialogRef<GridFilterDialogComponent>,
        private fb: FormBuilder,
        private gridTranslationsService: GridTranslationsService,
    )
    {
        // create form container
        this.containerForm = this.fb.group({
            formColumnFilter: this.fb.array([]),
        });
    }

    // string criteria information
    filterOperators: FilterCriteriaOperator[] = [
        {
            operator   : Operator.substring,
            translation: 'contains',
            types      : [ColumnDataType.STRING],
        },
        {
            operator   : Operator.endsWith,
            translation: 'endsWith',
            types      : [ColumnDataType.STRING],
        },
        {
            operator   : Operator.eq,
            translation: 'equals',
            types      : [ColumnDataType.STRING, ColumnDataType.DATE, ColumnDataType.NUMBER],
        },
        {
            operator   : Operator.gt,
            translation: 'greaterThan',
            types      : [ColumnDataType.DATE, ColumnDataType.NUMBER],
        },
        {
            operator   : Operator.gte,
            translation: 'greaterThanEqual',
            types      : [ColumnDataType.DATE, ColumnDataType.NUMBER],
        },
        {
            operator   : Operator.lt,
            translation: 'lessThan',
            types      : [ColumnDataType.DATE, ColumnDataType.NUMBER],
        },
        {
            operator   : Operator.lte,
            translation: 'lessThanEqual',
            types      : [ColumnDataType.DATE, ColumnDataType.NUMBER],
        },
        {
            operator   : Operator.ne,
            translation: 'notEquals',
            types      : [ColumnDataType.STRING, ColumnDataType.DATE, ColumnDataType.NUMBER],
        },
        {
            operator   : Operator.startsWith,
            translation: 'startsWith',
            types      : [ColumnDataType.STRING],
        },
    ];

    ngOnInit(): void
    {
        // avoid columns not filterable
        this.columnsConfig = this.data.columnsConfig
            .filter(columnConfig =>
                columnConfig.filterable !== false &&
                columnConfig.type !== ColumnDataType.ACTIONS &&
                columnConfig.type !== ColumnDataType.CHECKBOX,
            );

        // cerate subscription for filter columns in autocomplete component
        this.filteredColumnsConfig = this.searchFieldNameControl
            .valueChanges
            .pipe(
                startWith(''),
                map(value => this._filter(value)),
            );

        // set operator translations
        this.operatorsMessages = this.gridTranslationsService.operatorsMessages;

        // add active filters
        if (this.data.activatedColumnFilters.length > 0) this.generatePreviousDataForm(this.data.activatedColumnFilters);

        // only enabled search autocomplete if all filter columns are valid
        this.containerForm
            .valueChanges
            .subscribe(change =>
            {
                // if form is invalid, don't allow to create new form fields
                !this.containerForm.valid
                    ? this.searchFieldNameControl.disable()
                    : this.searchFieldNameControl.enable();
            });
    }

    // manage response data after close dialog
    handleCloseDialog(): FilterDialogResponse
    {
        return {
            filters: this.formColumnFilter.value,
        };
    }

    private _filter(value: string): ColumnConfig[]
    {
        // value is an object, so filter will trigger a type error
        if (typeof value !== 'string') return;

        // if value is empty, return all results
        if (!value || value == '') return this.columnsConfig;

        // translation is used to compare because it is what the users will see on screen (and what is relevant to them)
        return this.columnsConfig.filter(columnConfig =>
        {
            const translation = Utils.removeSpecialCharacters(this.gridTranslationsService.columnMessages[columnConfig.field].getValue()).toLowerCase();
            const searchTerm  = Utils.removeSpecialCharacters(value).toLowerCase();
            return translation.includes(searchTerm);
        });
    }

    /**
     * Function to manage filter column autocomplete is item selected
     */
    handleFieldSelectionChange(event: MatAutocompleteSelectedEvent): void
    {
        // value is reset instantly to avoid having an [object Object] in the field, as well as allowing for a new pick
        this.searchFieldNameControl.setValue('');

        // field is pushed to array of filters in order to render a new form field in template
        this.formColumnFilter.patchValue(
            this.sortFiltersArray(this.arrayColumnFilters, event.option.value.field),
        );

        // control insert in first position
        this.formColumnFilter.insert(0,
            this.fb.group({
                id      : this.fb.control(Utils.uuid()),
                field   : this.fb.control(event.option.value.field),
                type    : this.fb.control(event.option.value.type),
                operator: this.fb.control(null, [Validators.required]),
                value   : this.fb.control('', [Validators.required]),
            }),
        );
    }

    generatePreviousDataForm(gridColumnsFilter: GridColumnFilter[]): void
    {
        gridColumnsFilter.forEach(filter =>
        {
            this.formColumnFilter.push(
                this.fb.group({
                    id      : this.fb.control(filter.id),
                    field   : this.fb.control(filter.field),
                    type    : this.fb.control(filter.type),
                    operator: this.fb.control(filter.operator, [Validators.required]),
                    value   : this.fb.control(filter.value, [Validators.required]),
                }),
            );
        });
    }

    /**
     * when adding a new form element, it's inserted at the top
     * then it's followed by all elements with the same field
     * and then the rest of the fields
     */
    sortFiltersArray(gridColumnsFilter: GridColumnFilter[], fieldOrderBy: string): ColumnConfig[]
    {
        return [...gridColumnsFilter]
            .sort((a, b) =>
            {
                if (a.field === fieldOrderBy) return -1;
                return 1;
            });
    }

    handleDeleteFilter(index: number): void
    {
        this.formColumnFilter.removeAt(index);
    }

    handleRemoveFilters(): FilterDialogResponse
    {
        return {
            filters: [],
        };
    }
}