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
import { ResourceName } from 'views-components/data-explorer/renderers';
import { SortDirection } from 'components/data-table/data-column';
import { bindDataExplorerActions } from "store/data-explorer/data-explorer-action";
import {
    DataExplorerMiddlewareService,
    listResultsToDataExplorerItemsMeta,
    dataExplorerToListParams
} from 'store/data-explorer/data-explorer-middleware-service';
import { GroupResource } from "models/group";
import { ListResults } from 'services/common-service/common-service';
import { progressIndicatorActions } from 'store/progress-indicator/progress-indicator-actions';
import { DataExplorer as DataExplorerState, getDataExplorer } from 'store/data-explorer/data-explorer-reducer';
import { FilterBuilder, joinFilters } from "services/api/filter-builder";
import { getProperty } from 'store/properties/properties';
import { updateResources } from "store/resources/resources-actions";
import { sampleTrackerPatient } from "./metadataTerms";

export const PATIENT_LIST_PANEL_ID = "patientListPanel";
export const patientListPanelActions = bindDataExplorerActions(PATIENT_LIST_PANEL_ID);
export const STUDY_PANEL_CURRENT_UUID = "StudyPanelCurrentUUID";
export const PATIENT_PANEL_CURRENT_UUID = "PatientPanelCurrentUUID";
export const patientBaseRoutePath = "/SampleTracker/Patient";
export const patientRoutePath = patientBaseRoutePath + "/:uuid";

enum PatientPanelColumnNames {
    NAME = "Name"
}

export const patientListPanelColumns: DataColumns<string> = [
    {
        name: PatientPanelColumnNames.NAME,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <ResourceName uuid={uuid} />
    }
];

export const PatientListPanel = () =>
    <DataExplorer
        id={PATIENT_LIST_PANEL_ID}
        onRowClick={(uuid: string) => { }}
        onRowDoubleClick={(uuid: string) => { }}
        onContextMenu={(event: React.MouseEvent<HTMLElement>, resourceUuid: string) => { }}
        contextMenuColumn={true}
        dataTableDefaultView={
            <DataTableDefaultView />
        } />;

const setItems = (listResults: ListResults<GroupResource>) =>
    patientListPanelActions.SET_ITEMS({
        ...listResultsToDataExplorerItemsMeta(listResults),
        items: listResults.items.map(resource => resource.uuid),
    });

const getFilters = (dataExplorer: DataExplorerState, studyUuid: string) => {
    const fb = new FilterBuilder();
    fb.addEqual("owner_uuid", studyUuid);
    fb.addEqual("properties.type", sampleTrackerPatient);

    const nameFilters = new FilterBuilder()
        .addILike("name", dataExplorer.searchValue)
        .getFilters();

    return joinFilters(
        fb.getFilters(),
        nameFilters,
    );
};

const getParams = (dataExplorer: DataExplorerState, studyUuid: string) => ({
    ...dataExplorerToListParams(dataExplorer),
    filters: getFilters(dataExplorer, studyUuid),
});

export class PatientListPanelMiddlewareService extends DataExplorerMiddlewareService {
    constructor(private services: ServiceRepository, id: string) {
        super(id);
    }

    async requestItems(api: MiddlewareAPI<Dispatch, RootState>) {
        const state = api.getState();
        const dataExplorer = getDataExplorer(state.dataExplorer, this.getId());

        const studyUuid = getProperty<string>(STUDY_PANEL_CURRENT_UUID)(state.properties);

        if (!studyUuid) {
            return;
        }

        try {
            api.dispatch(progressIndicatorActions.START_WORKING(this.getId()));
            const response = await this.services.groupsService.list(getParams(dataExplorer, studyUuid));
            api.dispatch(progressIndicatorActions.PERSIST_STOP_WORKING(this.getId()));
            api.dispatch(updateResources(response.items));
            for (const i of response.items) {
                i.uuid = patientBaseRoutePath + "/" + i.uuid;
            }
            api.dispatch(updateResources(response.items));
            api.dispatch(setItems(response));
        } catch (e) {
            api.dispatch(progressIndicatorActions.PERSIST_STOP_WORKING(this.getId()));
            api.dispatch(patientListPanelActions.SET_ITEMS({
                items: [],
                itemsAvailable: 0,
                page: 0,
                rowsPerPage: dataExplorer.rowsPerPage
            }));
            // api.dispatch(couldNotFetchProjectContents());
        }
    }
}
