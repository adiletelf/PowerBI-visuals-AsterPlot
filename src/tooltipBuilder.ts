/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

// powerbi.extensibility.utils.formatting
import { valueFormatter } from "powerbi-visuals-utils-formattingutils";

// powerbi
// tslint:disable-next-line
import powerbi from "powerbi-visuals-api";
import PrimitiveValue = powerbi.PrimitiveValue;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import DataViewValueColumn = powerbi.DataViewValueColumn;
import DataViewCategorical = powerbi.DataViewCategorical;
import DataViewCategoricalColumn = powerbi.DataViewCategoricalColumn;
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

import {} from "powerbi-visuals-utils-tooltiputils";

const DefaultSeriesIndex: number = 0,
    DefaultDisplayName: string = "",
    DisplayNameSeparator: string = "/";

export interface TooltipCategoryDataItem {
    value?: PrimitiveValue;
    metadata: DataViewMetadataColumn[];
}

export interface TooltipSeriesDataItem {
    value?: PrimitiveValue;
    highlightedValue?: PrimitiveValue;
    metadata: DataViewValueColumn;
}

export function createTooltipInfo(
    dataViewCat: DataViewCategorical,
    categoryValue: PrimitiveValue,
    localizationManager,
    value?: PrimitiveValue,
    seriesIndex?: number): VisualTooltipDataItem[] {

    let categorySource: TooltipCategoryDataItem;
    let valuesSource: DataViewMetadataColumn = undefined;
    const seriesSource: TooltipSeriesDataItem[] = [];

    seriesIndex = seriesIndex | DefaultSeriesIndex;

    const categoriesData: DataViewCategoricalColumn[] = dataViewCat && dataViewCat.categories;

    if (categoriesData && categoriesData.length > 0) {
        if (categoriesData.length > 1) {
            const compositeCategoriesData: DataViewMetadataColumn[] = [];

            for (let i: number = 0, ilen: number = categoriesData.length; i < ilen; i++) {
                compositeCategoriesData.push(categoriesData[i].source);
            }

            categorySource = {
                value: categoryValue,
                metadata: compositeCategoriesData
            };
        }
        else {
            categorySource = {
                value: categoryValue,
                metadata: [categoriesData[0].source]
            };
        }
    }
    if (dataViewCat && dataViewCat.values) {
        if (!categorySource || !(categorySource.metadata[0] === dataViewCat.values.source)) {
            valuesSource = dataViewCat.values.source;
        }

        if (dataViewCat.values.length > 0) {
            const valueColumn: DataViewValueColumn = dataViewCat.values[seriesIndex],
                isAutoGeneratedColumn: boolean = !!(valueColumn
                    && valueColumn.source
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    && (<any>valueColumn.source).isAutoGeneratedColumn);

            if (!isAutoGeneratedColumn) {
                seriesSource.push({
                    value: value,
                    metadata: valueColumn
                });
            }
        }
    }

    return createTooltipData(
        categorySource,
        valuesSource,
        seriesSource,
        localizationManager);
}

export function createTooltipData(
    categoryValue: TooltipCategoryDataItem,
    valuesSource: DataViewMetadataColumn,
    seriesValues: TooltipSeriesDataItem[],
    localizationManager: ILocalizationManager): VisualTooltipDataItem[] {

    const categoryFormattedValue: string = getFormattedValue(
        categoryValue.metadata[0],
        categoryValue.value);
    const items: VisualTooltipDataItem[] = [];

    if (categoryValue) {
        if (categoryValue.metadata.length > 1) {
            let displayName: string = DefaultDisplayName;

            for (let i = 0, ilen = categoryValue.metadata.length; i < ilen; i++) {
                if (i !== 0) {
                    displayName += DisplayNameSeparator;
                }

                displayName += categoryValue.metadata[i].displayName;
            }
            const categoryFormattedValue: string = getFormattedValue(
                categoryValue.metadata[0],
                categoryValue.value);

            items.push({
                displayName,
                value: categoryFormattedValue
            });
        }
        else {

            items.push({
                displayName: categoryValue.metadata[0].displayName,
                value: categoryFormattedValue
            });
        }
    }

    if (valuesSource) {
        // Dynamic series value
        let dynamicValue: string;

        if (seriesValues.length > 0) {
            const dynamicValueMetadata: DataViewMetadataColumn = seriesValues[0].metadata.source;

            dynamicValue = getFormattedValue(
                valuesSource,
                dynamicValueMetadata.groupName);
        }

        items.push({
            displayName: valuesSource.displayName,
            value: dynamicValue
        });
    }

    for (let i = 0; i < seriesValues.length; i++) {
        const seriesData: TooltipSeriesDataItem = seriesValues[i];

        if (seriesData && seriesData.metadata) {
            const seriesMetadataColumn: DataViewMetadataColumn = seriesData.metadata.source,
                value: PrimitiveValue = seriesData.value,
                highlightedValue: PrimitiveValue = seriesData.highlightedValue;

            if (value || value === 0) {
                const formattedValue: string = getFormattedValue(
                    seriesMetadataColumn,
                    value);

                items.push({
                    displayName: seriesMetadataColumn.displayName,
                    value: formattedValue
                });
            }

            if (highlightedValue || highlightedValue === 0) {
                const formattedHighlightedValue: string = getFormattedValue(
                    seriesMetadataColumn,
                    highlightedValue);

                items.push({
                    displayName: localizationManager.getDisplayName("Visual_Hightlighted"),
                    value: formattedHighlightedValue
                });
            }
        }
    }

    return items;
}

export function getFormattedValue(column: DataViewMetadataColumn, value: PrimitiveValue): string {
    const formatString: string = getFormatStringFromColumn(column);

    return valueFormatter.format(value, formatString);
}

export function getFormatStringFromColumn(column: DataViewMetadataColumn): string {
    if (column) {
        const formatString: string = valueFormatter.getFormatStringByColumn(column, true);

        return formatString || column.format;
    }

    return null;
}
