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
import { SortDirection } from '~/components/data-table/data-column';
import { bindDataExplorerActions } from "~/store/data-explorer/data-explorer-action";
import { Typography, Button } from '@material-ui/core';
import { initialize } from 'redux-form';
import { dialogActions } from "~/store/dialog/dialog-actions";
import { Resource } from '~/models/resource';
import { openRunProcess } from '~/store/workflow-panel/workflow-panel-actions';

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
import { loadResource } from "~/store/resources/resources-actions";

export const SAMPLE_LIST_PANEL_ID = "sampleListPanel";
export const sampleListPanelActions = bindDataExplorerActions(SAMPLE_LIST_PANEL_ID);
export const sampleTrackerSampleType = "sample_tracker:sample";
export const sampleTrackerExtractionType = "sample_tracker:extraction";
export const PATIENT_PANEL_CURRENT_UUID = "PatientPanelCurrentUUID";
export const SAMPLE_PANEL_CURRENT_UUID = "SamplePanelCurrentUUID";
export const sampleBaseRoutePath = "/SampleTracker/Sample";
export const sampleRoutePath = sampleBaseRoutePath + "/:uuid";

export const EXTRACTION_CREATE_FORM_NAME = "extractionCreateFormName";
const PATIENT_PANEL_SAMPLES = "PATIENT_PANEL_SAMPLES";
export const SAMPLE_CREATE_FORM_NAME = "sampleCreateFormName";

export enum AnalysisState {
    NEW = "NEW",
    AT_SEQUENCING = "AT_SEQUENCING",
    SEQUENCED = "SEQUENCED",
    SEQ_FAILED = "SEQ_FAILED",
    ANALYSIS_COMPLETE = "ANALYSIS_COMPLETE"
}

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
    WORKFLOW_STATE = "WorkflowState",
}

export const TimestampComponent = connect(
    (state: RootState, props: { uuid: string, propertyname: string }) => {
        const resource = getResource<LinkResource>(props.uuid)(state.resources);
        return { resource, propertyname: props.propertyname };
    })((props: { resource: LinkResource, propertyname: string } & DispatchProp<any>) => <span>{props.resource.properties[props.propertyname]}</span>);

interface PropertiedResource extends Resource {
    name: string;
    properties: any;
}

export const openExtractionCreateDialog = (sampleUuid: string, editExisting?: PropertiedResource) =>
    (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        if (editExisting) {
            dispatch(initialize(EXTRACTION_CREATE_FORM_NAME,
                {
                    sampleUuid,
                    additionalId: editExisting.properties["sample_tracker:additional_id"],
                    state: editExisting.properties["sample_tracker:state"],
                    extractionType: editExisting.properties["sample_tracker:extraction_type"],
                    batchUuid: editExisting.properties["sample_tracker:batch_uuid"],
                    uuidSelf: editExisting.uuid,
                }));
        } else {
            dispatch(initialize(EXTRACTION_CREATE_FORM_NAME,
                {
                    sampleUuid,
                    additionalId: 1,
                    state: AnalysisState.NEW
                }));
        }
        dispatch(dialogActions.OPEN_DIALOG({
            id: EXTRACTION_CREATE_FORM_NAME, data: { updating: editExisting !== undefined, }
        }));
    };

export const ExtractionComponent = connect((state: RootState, props: { resource: PropertiedResource }) => props)(
    (props: { resource: PropertiedResource } & DispatchProp<any>) =>
        <Typography color="primary" style={{ width: 'auto', cursor: 'pointer' }}
            onClick={() => props.dispatch<any>(openExtractionCreateDialog(props.resource.properties["sample_tracker:sample_uuid"], props.resource))}
        >{props.resource.name}</Typography>);

export const openSampleCreateDialog = (patientUuid: string, editExisting?: PropertiedResource) =>
    (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        if (editExisting) {
            dispatch(initialize(SAMPLE_CREATE_FORM_NAME, {
                patientUuid,
                collectionType: editExisting.properties["sample_tracker:collection_type"],
                sampleType: editExisting.properties["sample_tracker:sample_type"],
                collectedAt: editExisting.properties["sample_tracker:collected_at"],
                timePoint: editExisting.properties["sample_tracker:time_point"],
                flowStartedAt: editExisting.properties["sample_tracker:flow_started_at"],
                flowCompletedAt: editExisting.properties["sample_tracker:flow_completed_at"]
            }));
        } else {
            dispatch(initialize(SAMPLE_CREATE_FORM_NAME, { patientUuid }));
        }
        dispatch(dialogActions.OPEN_DIALOG({ id: SAMPLE_CREATE_FORM_NAME, data: { updating: editExisting !== undefined } }));
    };

export const SampleComponent = connect((state: RootState, props: { resource: PropertiedResource }) => props)(
    (props: { resource: PropertiedResource } & DispatchProp<any>) =>
        <Typography color="primary" style={{ width: 'auto', cursor: 'pointer' }}
            onClick={() => props.dispatch<any>(openSampleCreateDialog(props.resource.properties["sample_tracker:sample_uuid"], props.resource))}
        >{props.resource.name}</Typography>);


export const PropertyComponent = (props: { resource: PropertiedResource, propertyname: string }) =>
    <span>{props.resource.properties[props.propertyname]}</span>;

export const ResourceComponent = connect(
    (state: RootState, props: { uuid: string, render: (item: PropertiedResource) => React.ReactElement<any> }) => {
        const resource = getResource<PropertiedResource>(props.uuid)(state.resources);
        return { resource, render: props.render };
    })((props: { resource: PropertiedResource, render: (item: PropertiedResource) => React.ReactElement<any> } & DispatchProp<any>) => (props.resource ? props.render(props.resource) : <br />));


export const MultiResourceComponent = connect(
    (state: RootState, props: { uuid: string, render: (item: PropertiedResource) => React.ReactElement<any> }) => {
        const reverse = getProperty<{ [key: string]: any[] }>(PATIENT_PANEL_SAMPLES)(state.properties);
        let items = (reverse && reverse[props.uuid]) || [];
        items = items.map(item => {
            const rsc = getResource<GroupResource>(item)(state.resources);
            return rsc || { uuid: "", properties: {} };
        });
        return { items, render: props.render };
    })((props: { items: any[], render: (item: PropertiedResource) => React.ReactElement<any> } & DispatchProp<any>) => <>
        {props.items.map(item =>
            <div key={item.uuid} > {props.render(item)}</div>
        )}
    </>
    );

export const RunProcessComponent = connect((state: RootState, props: { resource: PropertiedResource }) => props)(
    (props: { resource: PropertiedResource } & DispatchProp<any>) =>
        <Button onClick={() => props.dispatch<any>(openRunProcess(""))}>Start</Button>);

export const sampleListPanelColumns: DataColumns<string> = [
    {
        name: SamplePanelColumnNames.SAMPLE_TYPE,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <ResourceComponent uuid={uuid}
            render={rsc => <PropertyComponent resource={rsc} propertyname="sample_tracker:sample_type" />} />
    },
    {
        name: SamplePanelColumnNames.TIME_POINT,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <ResourceComponent uuid={uuid}
            render={rsc => <PropertyComponent resource={rsc} propertyname="sample_tracker:time_point" />} />
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
        name: SamplePanelColumnNames.NAME,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <ResourceComponent uuid={uuid}
            render={rsc => <SampleComponent resource={rsc} />} />
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
        render: uuid => <MultiResourceComponent uuid={uuid.substr(sampleBaseRoutePath.length + 1)}
            render={rsc => <ExtractionComponent resource={rsc} />} />
    },
    {
        name: SamplePanelColumnNames.BATCH_ID,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <MultiResourceComponent uuid={uuid.substr(sampleBaseRoutePath.length + 1)}
            render={rsc => <ResourceComponent uuid={rsc.properties["sample_tracker:batch_uuid"]}
                render={rsc2 => <span>{rsc2.name}</span>} />} />
    },
    {
        name: SamplePanelColumnNames.TRACKER_STATE,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <MultiResourceComponent uuid={uuid.substr(sampleBaseRoutePath.length + 1)}
            render={rsc => <PropertyComponent resource={rsc} propertyname="sample_tracker:state" />} />
    },
    {
        name: SamplePanelColumnNames.WORKFLOW_STATE,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <MultiResourceComponent uuid={uuid.substr(sampleBaseRoutePath.length + 1)}
            render={rsc => <RunProcessComponent resource={rsc} />} />
    },
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

        loadResource(patientUuid);

        try {
            api.dispatch(progressIndicatorActions.START_WORKING(this.getId()));
            const response = await this.services.linkService.list(getSampleParams(dataExplorer, patientUuid));
            const response2 = await this.services.groupsService.list(getExtractionParams(dataExplorer, patientUuid));
            api.dispatch(progressIndicatorActions.PERSIST_STOP_WORKING(this.getId()));

            const reverse = {};
            const batches = [];
            for (const i of response2.items) {
                const sid = i.properties["sample_tracker:sample_uuid"];
                const lst = reverse[sid] || [];
                lst.push(i.uuid);
                reverse[sid] = lst;
                const batch = i.properties["sample_tracker:batch_uuid"];
                if (batch) {
                    batches.push(batch);
                }
            }
            api.dispatch(propertiesActions.SET_PROPERTY({ key: PATIENT_PANEL_SAMPLES, value: reverse }));

            const response3 = await this.services.groupsService.list({
                filters: new FilterBuilder()
                    .addIn("uuid", batches)
                    .getFilters()
            });

            api.dispatch(updateResources(response.items));

            for (const i of response.items) {
                i.uuid = sampleBaseRoutePath + "/" + i.uuid;
            }
            api.dispatch(updateResources(response.items));
            api.dispatch(updateResources(response2.items));
            api.dispatch(updateResources(response3.items));
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
