// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { ServiceRepository } from "services/services";
import { MiddlewareAPI, Dispatch } from "redux";
import { RootState } from 'store/store';
import { DataExplorer } from "views-components/data-explorer/data-explorer";
import { DataTableDefaultView } from 'components/data-table-default-view/data-table-default-view';
import { DataColumns } from 'components/data-table/data-table';
import { createTree } from 'models/tree';
import { SortDirection } from 'components/data-table/data-column';
import { bindDataExplorerActions } from "store/data-explorer/data-explorer-action";
import {
    DataExplorerMiddlewareService,
    listResultsToDataExplorerItemsMeta,
    dataExplorerToListParams
} from 'store/data-explorer/data-explorer-middleware-service';
import { GroupResource, GroupClass } from "models/group";
import { CollectionResource } from "models/collection";
import { ListResults } from 'services/common-service/common-service';
import { progressIndicatorActions } from 'store/progress-indicator/progress-indicator-actions';
import { DataExplorer as DataExplorerState, getDataExplorer } from 'store/data-explorer/data-explorer-reducer';
import { FilterBuilder, joinFilters } from "services/api/filter-builder";
import { updateResources } from "store/resources/resources-actions";
import { connect, DispatchProp } from 'react-redux';
import { getResource } from "store/resources/resources";
import { Typography } from '@material-ui/core';
import { initialize } from 'redux-form';
import { dialogActions } from "store/dialog/dialog-actions";
import { StudyPathId } from './patient';
import { matchPath } from "react-router";
import { propertiesActions } from "store/properties/properties-actions";
import { studyRoutePath } from './studyList';
import {
    sampleTrackerBatch, sampleTrackerSample, sampleTrackerState,
    sampleTrackerBatchId, AnalysisState, sampleTrackerBatchList
} from './metadataTerms';
import { ResourceComponent } from './resource-component';
import { RunProcessComponent } from './run-process';

export const BATCH_LIST_PANEL_ID = "batchPanel";
export const batchListPanelActions = bindDataExplorerActions(BATCH_LIST_PANEL_ID);
export const batchListRoutePath = "/sampleTracker/Batches";
export const batchRoutePath = batchListRoutePath + "/:uuid";
export const BATCH_CREATE_FORM_NAME = "batchCreateFormName";

export const BATCHES_TO_WORKFLOW_RUNS = "BATCHES_TO_WORKFLOW_RUNS";

enum BatchPanelColumnNames {
    NAME = "Name",
    WORKFLOW_STATE = "Workflow State",
}

export interface BatchCreateFormDialogData {
    ownerUuid: string;
    selfUuid?: string;
    name: string;
    state: AnalysisState;
    selections: {
        sample: CollectionResource,
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

        const results = await services.collectionService.list({
            filters: new FilterBuilder()
                .addEqual("properties.type", sampleTrackerSample)
                .addEqual("properties." + sampleTrackerBatchId, "").getFilters()
        });
        const results2 = await services.collectionService.list({
            filters: new FilterBuilder()
                .addEqual("properties.type", sampleTrackerSample)
                .addDoesNotExist(sampleTrackerBatchId).getFilters()
        });

        const selections = results.items.concat(results2.items).map((item) => ({
            sample: item,
            value: false,
            startingValue: false
        }));

        //const studyid = matchPath<StudyPathId>(getState().router.location!.pathname, { path: studyRoutePath, exact: true });

        const batchProjects = await services.groupsService.list({
            filters: new FilterBuilder()
                .addEqual("group_class", "project")
                .addEqual("properties.type", sampleTrackerBatchList).getFilters()
        });
        const state = getState();
        let writableProjects = batchProjects.items.filter((f) => f.writableBy.includes(state.auth.user!.uuid));
        let prj: GroupResource;
        if (writableProjects.length == 0) {
            prj = await services.groupsService.create({
                groupClass: GroupClass.PROJECT,
                name: "Batches",
                properties: {
                    type: sampleTrackerBatchList
                }
            });
        } else {
            prj = writableProjects[0];
        }

        const formup: Partial<BatchCreateFormDialogData> = { selections, ownerUuid: prj.uuid };
        if (editExisting) {
            formup.selfUuid = editExisting.uuid;
            formup.name = editExisting.name;
            formup.state = editExisting.properties[sampleTrackerState];
            const results3 = await services.collectionService.list({
                filters: new FilterBuilder()
                    .addEqual("properties.type", sampleTrackerSample)
                    .addEqual("properties." + sampleTrackerBatchId, editExisting.name)
                    .getFilters()
            });
            for (const item of results3.items) {
                selections.push({
                    sample: item,
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
    },
    {
        name: BatchPanelColumnNames.WORKFLOW_STATE,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <ResourceComponent uuid={uuid}
            render={rsc => <RunProcessComponent resource={rsc}
                lookupProperty={BATCHES_TO_WORKFLOW_RUNS}
                workflowToRun="x2b8c-7fd4e-oi0uz0pt4qnpk7v" />} />
    }
];

export const openBatchListPanel = (dispatch: Dispatch) => {
    dispatch(batchListPanelActions.SET_COLUMNS({ columns: batchListPanelColumns }));
    dispatch(batchListPanelActions.REQUEST_ITEMS());
};

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
    fb.addEqual("properties.type", sampleTrackerBatch);

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

            const responseContainerRequests = await this.services.containerRequestService.list({
                filters: (new FilterBuilder().addIn("owner_uuid", response.items.map(s => s.uuid)).addEqual("requesting_container_uuid", null)).getFilters(),
                order: "created_at desc"
            });
            const responseContainers = await this.services.containerService.list({
                filters: (new FilterBuilder().addIn("uuid", responseContainerRequests.items.filter(s => s != null).map(s => s.containerUuid!))).getFilters()
            });

            const samplesToWf = {};
            for (const i of response.items) {
                for (const j of responseContainerRequests.items) {
                    if (i.uuid === j.ownerUuid) {
                        samplesToWf[i.uuid] = j;
                        break;
                    }
                }
            }
            api.dispatch(propertiesActions.SET_PROPERTY({ key: BATCHES_TO_WORKFLOW_RUNS, value: samplesToWf }));

            api.dispatch(progressIndicatorActions.PERSIST_STOP_WORKING(this.getId()));
            api.dispatch(updateResources(response.items));
            api.dispatch(updateResources(responseContainerRequests.items));
            api.dispatch(updateResources(responseContainers.items));
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
