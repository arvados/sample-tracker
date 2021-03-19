// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { ServiceRepository } from "~/services/services";
import { MiddlewareAPI, Dispatch } from "redux";
import { RootState } from '~/store/store';
import { DataExplorer } from "~/views-components/data-explorer/data-explorer";
import { DataTableDefaultView } from '~/components/data-table-default-view/data-table-default-view';
import { DataColumns } from '~/components/data-table/data-table';
import { createTree } from '~/models/tree';
import { SortDirection } from '~/components/data-table/data-column';
import { bindDataExplorerActions } from "~/store/data-explorer/data-explorer-action";
import {
    DataExplorerMiddlewareService,
    listResultsToDataExplorerItemsMeta,
    dataExplorerToListParams
} from '~/store/data-explorer/data-explorer-middleware-service';
import { GroupResource } from "~/models/group";
import { ListResults } from '~/services/common-service/common-service';
import { progressIndicatorActions } from '~/store/progress-indicator/progress-indicator-actions.ts';
import { DataExplorer as DataExplorerState, getDataExplorer } from '~/store/data-explorer/data-explorer-reducer';
import { FilterBuilder, joinFilters } from "~/services/api/filter-builder";
import { updateResources } from "~/store/resources/resources-actions";
import { connect, DispatchProp } from 'react-redux';
import { getResource } from "~/store/resources/resources";
import { Typography } from '@material-ui/core';
import { initialize } from 'redux-form';
import { dialogActions } from "~/store/dialog/dialog-actions";
import { AnalysisState } from './sampleList';
import { StudyPathId } from './patient';
import { matchPath } from "react-router";
import { studyRoutePath } from './studyList';

export const BATCH_LIST_PANEL_ID = "batchPanel";
export const batchListPanelActions = bindDataExplorerActions(BATCH_LIST_PANEL_ID);
export const sampleTrackerBatchType = "sample_tracker:batch";
export const batchListRoutePath = "/sampleTracker/Batches";
export const batchRoutePath = batchListRoutePath + "/:uuid";
export const BATCH_CREATE_FORM_NAME = "batchCreateFormName";

enum BatchPanelColumnNames {
    NAME = "Name"
}

export interface BatchCreateFormDialogData {
    ownerUuid: string;
    selfUuid?: string;
    name: string;
    state: AnalysisState;
    selections: {
        extraction: GroupResource,
        value: boolean,
        startingValue: boolean,
    }[];
}

export const BatchNameComponent = connect(
    (state: RootState, props: { uuid: string }) => {
        const resource = getResource<GroupResource>(props.uuid)(state.resources);
        return resource;
    })((resource: GroupResource & DispatchProp<any>) =>
        <Typography color="primary" style={{ width: 'auto', cursor: 'pointer' }}
            onClick={() => resource.dispatch<any>(openBatchCreateDialog(resource))}
        >{resource.name}</Typography>);

export const openBatchCreateDialog = (editExisting?: GroupResource) =>
    async (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        const filters = new FilterBuilder()
            .addEqual("properties.type", "sample_tracker:extraction")
            .addEqual("properties.sample_tracker:state", "NEW")
            .addEqual("properties.sample_tracker:batch_uuid", "");
        const results = await services.groupsService.list({
            filters: filters.getFilters()
        });
        const samples = await services.linkService.list({
            filters: new FilterBuilder()
                .addIn("uuid", results.items.map((item) => item.properties["sample_tracker:sample_uuid"]))
                .getFilters()
        });
        console.log(samples);
        const selections = results.items.map((item) => ({
            extraction: item,
            value: false,
            startingValue: false
        }));

        const studyid = matchPath<StudyPathId>(getState().router.location!.pathname, { path: studyRoutePath, exact: true });

        const formup: Partial<BatchCreateFormDialogData> = { selections, ownerUuid: studyid!.params.uuid };
        if (editExisting) {
            formup.selfUuid = editExisting.uuid;
            formup.name = editExisting.name;
            formup.state = editExisting.properties["sample_tracker:state"];
            const results2 = await services.groupsService.list({
                filters: new FilterBuilder()
                    .addEqual("properties.type", "sample_tracker:extraction")
                    .addEqual("properties.sample_tracker:batch_uuid", editExisting.uuid)
                    .getFilters()
            });
            for (const item of results2.items) {
                selections.push({
                    extraction: item,
                    value: true,
                    startingValue: true
                });
            }
        }
        dispatch(initialize(BATCH_CREATE_FORM_NAME, formup));
        dispatch(dialogActions.OPEN_DIALOG({ id: BATCH_CREATE_FORM_NAME, data: formup }));
    };

export const batchListPanelColumns: DataColumns<string> = [
    {
        name: BatchPanelColumnNames.NAME,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <BatchNameComponent uuid={uuid} />
    }
];

export const BatchListMainPanel = () =>
    <DataExplorer
        id={BATCH_LIST_PANEL_ID}
        onRowClick={(uuid: string) => { }}
        onRowDoubleClick={(uuid: string) => { }}
        onContextMenu={(event: React.MouseEvent<HTMLElement>, resourceUuid: string) => { }}
        contextMenuColumn={true}
        dataTableDefaultView={
            <DataTableDefaultView />
        } />;


const setItems = (listResults: ListResults<GroupResource>) =>
    batchListPanelActions.SET_ITEMS({
        ...listResultsToDataExplorerItemsMeta(listResults),
        items: listResults.items.map(resource => resource.uuid),
    });

const getFilters = (dataExplorer: DataExplorerState) => {
    const fb = new FilterBuilder();
    fb.addEqual("properties.type", sampleTrackerBatchType);

    const nameFilters = new FilterBuilder()
        .addILike("name", dataExplorer.searchValue)
        .getFilters();

    return joinFilters(
        fb.getFilters(),
        nameFilters,
    );
};

const getParams = (dataExplorer: DataExplorerState) => ({
    ...dataExplorerToListParams(dataExplorer),
    filters: getFilters(dataExplorer),
});

export class BatchListPanelMiddlewareService extends DataExplorerMiddlewareService {
    constructor(private services: ServiceRepository, id: string) {
        super(id);
    }

    async requestItems(api: MiddlewareAPI<Dispatch, RootState>) {
        const state = api.getState();
        const dataExplorer = getDataExplorer(state.dataExplorer, this.getId());

        try {
            api.dispatch(progressIndicatorActions.START_WORKING(this.getId()));
            const response = await this.services.groupsService.list(getParams(dataExplorer));
            api.dispatch(progressIndicatorActions.PERSIST_STOP_WORKING(this.getId()));
            api.dispatch(updateResources(response.items));
            api.dispatch(setItems(response));
        } catch (e) {
            api.dispatch(progressIndicatorActions.PERSIST_STOP_WORKING(this.getId()));
            api.dispatch(batchListPanelActions.SET_ITEMS({
                items: [],
                itemsAvailable: 0,
                page: 0,
                rowsPerPage: dataExplorer.rowsPerPage
            }));
            // api.dispatch(couldNotFetchProjectContents());
        }
    }
}
