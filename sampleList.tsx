// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { ServiceRepository } from "~/services/services";
import { MiddlewareAPI, Dispatch } from "redux";
import { RootState } from '~/store/store';
import { DispatchProp, connect } from 'react-redux';
import { DataColumns } from '~/components/data-table/data-table';
import { createTree } from '~/models/tree';
// import { ResourceName } from '~/views-components/data-explorer/renderers';
import { SortDirection } from '~/components/data-table/data-column';
import { bindDataExplorerActions } from "~/store/data-explorer/data-explorer-action";

import {
    DataExplorerMiddlewareService,
    listResultsToDataExplorerItemsMeta,
    dataExplorerToListParams
} from '~/store/data-explorer/data-explorer-middleware-service';
import { LinkResource } from "~/models/link";
import { GroupResource } from "~/models/group";
import { ListResults } from '~/services/common-service/common-service';
import { progressIndicatorActions } from '~/store/progress-indicator/progress-indicator-actions.ts';
import { DataExplorer as DataExplorerState, getDataExplorer } from '~/store/data-explorer/data-explorer-reducer';
import { FilterBuilder, joinFilters } from "~/services/api/filter-builder";
import { updateResources } from "~/store/resources/resources-actions";
import { getProperty } from '~/store/properties/properties';
import { getResource } from "~/store/resources/resources";
import { propertiesActions } from "~/store/properties/properties-actions";

export const SAMPLE_LIST_PANEL_ID = "sampleListPanel";
export const sampleListPanelActions = bindDataExplorerActions(SAMPLE_LIST_PANEL_ID);
export const sampleTrackerSampleType = "sample_tracker:sample";
export const sampleTrackerExtractionType = "sample_tracker:extraction";
export const PATIENT_PANEL_CURRENT_UUID = "PatientPanelCurrentUUID";
export const SAMPLE_PANEL_CURRENT_UUID = "SamplePanelCurrentUUID";
export const sampleBaseRoutePath = "/SampleTracker/Sample";
export const sampleRoutePath = sampleBaseRoutePath + "/:uuid";

const PATIENT_PANEL_SAMPLES = "PATIENT_PANEL_SAMPLES";

enum SamplePanelColumnNames {
    NAME = "Name",
    TIME_POINT = "Time point",
    COLLECTION_TYPE = "Collection type",
    SAMPLE_TYPE = "Sample type",
    FLOW_STARTED_AT = "Flow started",
    FLOW_COMPLETED_AT = "Flow completed",
    COLLECTED_AT = "Collected",
    EXTRACTION_TYPE = "Extraction",
    TRACKER_STATE = "State",
    BATCH_ID = "Batch",
}

export const TimePointComponent = connect(
    (state: RootState, props: { uuid: string }) => {
        const resource = getResource<LinkResource>(props.uuid)(state.resources);
        return resource;
    })((resource: LinkResource & DispatchProp<any>) => <span>{resource.properties["sample_tracker:time_point"]}</span>);

export const CollectionTypeComponent = connect(
    (state: RootState, props: { uuid: string }) => {
        const resource = getResource<LinkResource>(props.uuid)(state.resources);
        return resource;
    })((resource: LinkResource & DispatchProp<any>) => <span>{resource.properties["sample_tracker:collection_type"]}</span>);

export const SampleTypeComponent = connect(
    (state: RootState, props: { uuid: string }) => {
        const resource = getResource<LinkResource>(props.uuid)(state.resources);
        return resource;
    })((resource: LinkResource & DispatchProp<any>) => <span>{resource.properties["sample_tracker:sample_type"]}</span>);

export const TimestampComponent = connect(
    (state: RootState, props: { uuid: string, propertyname: string }) => {
        const resource = getResource<LinkResource>(props.uuid)(state.resources);
        return { resource, propertyname: props.propertyname };
    })((props: { resource: LinkResource, propertyname: string } & DispatchProp<any>) => <span>{props.resource.properties[props.propertyname]}</span>);

export const MultiCellComponent = connect(
    (state: RootState, props: { uuid: string, propertyname: string }) => {
        const reverse = getProperty<{ [key: string]: any[] }>(PATIENT_PANEL_SAMPLES)(state.properties);
        let items = (reverse && reverse[props.uuid]) || [];
        items = items.map(item => {
            const rsc = getResource<GroupResource>(item)(state.resources);
            return rsc || { uuid: "", properties: {} };
        });
        return { items, propertyname: props.propertyname };
    })((props: { items: any[], propertyname: string } & DispatchProp<any>) => <>
        {props.items.map(item =>
            <div key={item.uuid} > {item.properties[props.propertyname]}</div>
        )}
    </>
    );


export const sampleListPanelColumns: DataColumns<string> = [
    /*{
        name: SamplePanelColumnNames.NAME,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <ResourceName uuid={uuid} />
    },*/
    {
        name: SamplePanelColumnNames.TIME_POINT,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <TimePointComponent uuid={uuid} />
    },
    {
        name: SamplePanelColumnNames.COLLECTED_AT,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <TimestampComponent uuid={uuid} propertyname="sample_tracker:collected_at" />
    },
    {
        name: SamplePanelColumnNames.COLLECTION_TYPE,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <CollectionTypeComponent uuid={uuid} />
    },
    {
        name: SamplePanelColumnNames.SAMPLE_TYPE,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <SampleTypeComponent uuid={uuid} />
    },
    {
        name: SamplePanelColumnNames.FLOW_STARTED_AT,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <TimestampComponent uuid={uuid} propertyname="sample_tracker:flow_started_at" />
    },
    {
        name: SamplePanelColumnNames.FLOW_COMPLETED_AT,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <TimestampComponent uuid={uuid} propertyname="sample_tracker:flow_completed_at" />
    },
    {
        name: SamplePanelColumnNames.EXTRACTION_TYPE,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <MultiCellComponent uuid={uuid.substr(sampleBaseRoutePath.length + 1)} propertyname="sample_tracker:extraction_type" />
    },
    {
        name: SamplePanelColumnNames.BATCH_ID,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <MultiCellComponent uuid={uuid.substr(sampleBaseRoutePath.length + 1)} propertyname="sample_tracker:batch_uuid" />
    },
    {
        name: SamplePanelColumnNames.TRACKER_STATE,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <MultiCellComponent uuid={uuid.substr(sampleBaseRoutePath.length + 1)} propertyname="sample_tracker:state" />
    }
];

const setItems = (listResults: ListResults<LinkResource>) =>
    sampleListPanelActions.SET_ITEMS({
        ...listResultsToDataExplorerItemsMeta(listResults),
        items: listResults.items.map(resource => resource.uuid),
    });

const getSampleFilters = (dataExplorer: DataExplorerState, patientUuid: string) => {
    const fb = new FilterBuilder();
    fb.addEqual("owner_uuid", patientUuid);
    fb.addEqual("link_class", sampleTrackerSampleType);

    const nameFilters = new FilterBuilder()
        .addILike("name", dataExplorer.searchValue)
        .getFilters();

    return joinFilters(
        fb.getFilters(),
        nameFilters,
    );
};

const getSampleParams = (dataExplorer: DataExplorerState, patientUuid: string) => ({
    ...dataExplorerToListParams(dataExplorer),
    filters: getSampleFilters(dataExplorer, patientUuid),
});


const getExtractionFilters = (dataExplorer: DataExplorerState, patientUuid: string) => {
    const fb = new FilterBuilder();
    fb.addEqual("owner_uuid", patientUuid);
    fb.addEqual("properties.type", sampleTrackerExtractionType);

    const nameFilters = new FilterBuilder()
        .addILike("name", dataExplorer.searchValue)
        .getFilters();

    return joinFilters(
        fb.getFilters(),
        nameFilters,
    );
};

const getExtractionParams = (dataExplorer: DataExplorerState, patientUuid: string) => ({
    ...dataExplorerToListParams(dataExplorer),
    filters: getExtractionFilters(dataExplorer, patientUuid),
});

export class SampleListPanelMiddlewareService extends DataExplorerMiddlewareService {
    constructor(private services: ServiceRepository, id: string) {
        super(id);
    }

    async requestItems(api: MiddlewareAPI<Dispatch, RootState>) {
        const state = api.getState();
        const dataExplorer = getDataExplorer(state.dataExplorer, this.getId());

        const patientUuid = getProperty<string>(PATIENT_PANEL_CURRENT_UUID)(state.properties);

        if (!patientUuid) {
            return;
        }

        try {
            api.dispatch(progressIndicatorActions.START_WORKING(this.getId()));
            const response = await this.services.linkService.list(getSampleParams(dataExplorer, patientUuid));
            const response2 = await this.services.groupsService.list(getExtractionParams(dataExplorer, patientUuid));
            api.dispatch(progressIndicatorActions.PERSIST_STOP_WORKING(this.getId()));

            const reverse = {};
            for (const i of response2.items) {
                const sid = i.properties["sample_tracker:sample_uuid"];
                const lst = reverse[sid] || [];
                lst.push(i.uuid);
                reverse[sid] = lst;
            }
            api.dispatch(propertiesActions.SET_PROPERTY({ key: PATIENT_PANEL_SAMPLES, value: reverse }));

            api.dispatch(updateResources(response.items));

            for (const i of response.items) {
                i.uuid = sampleBaseRoutePath + "/" + i.uuid;
            }
            api.dispatch(updateResources(response.items));
            api.dispatch(updateResources(response2.items));
            api.dispatch(setItems(response));
        } catch (e) {
            api.dispatch(progressIndicatorActions.PERSIST_STOP_WORKING(this.getId()));
            api.dispatch(sampleListPanelActions.SET_ITEMS({
                items: [],
                itemsAvailable: 0,
                page: 0,
                rowsPerPage: dataExplorer.rowsPerPage
            }));
            // api.dispatch(couldNotFetchProjectContents());
        }
    }
}
