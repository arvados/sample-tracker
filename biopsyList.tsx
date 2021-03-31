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

import {
    sampleTrackerBiopsy, sampleTrackerSample, sampleTrackerAliquot,
    sampleTrackerState, sampleTrackerCollectionType, sampleTrackerBiopsyType,
    sampleTrackerCollectedAt, sampleTrackerTimePoint, sampleTrackerFlowStartedAt,
    sampleTrackerFlowCompletedAt, sampleTrackerSentForSequencingAt,
    sampleTrackerSequencingCompletedAt, sampleTrackerBatchUuid, sampleTrackerSampleType
} from './metadataTerms';

export const BIOPSY_LIST_PANEL_ID = "biopsyListPanel";
export const biopsyListPanelActions = bindDataExplorerActions(BIOPSY_LIST_PANEL_ID);

export const PATIENT_PANEL_CURRENT_UUID = "PatientPanelCurrentUUID";
export const BIOPSY_PANEL_CURRENT_UUID = "BiopsyPanelCurrentUUID";
export const biopsyBaseRoutePath = "/BiopsyTracker/Biopsy";
export const biopsyRoutePath = biopsyBaseRoutePath + "/:uuid";

export const SAMPLE_CREATE_FORM_NAME = "sampleCreateFormName";
const PATIENT_PANEL_BIOPSIES = "PATIENT_PANEL_BIOPSIES";
export const BIOPSY_CREATE_FORM_NAME = "biopsyCreateFormName";

export enum AnalysisState {
    NEW = "NEW",
    AT_SEQUENCING = "AT_SEQUENCING",
    SEQUENCED = "SEQUENCED",
    SEQ_FAILED = "SEQ_FAILED",
    ANALYSIS_COMPLETE = "ANALYSIS_COMPLETE"
}

enum BiopsyPanelColumnNames {
    NAME = "Name",
    TIME_POINT = "Time point",
    COLLECTION_TYPE = "Collection type",
    BIOPSY_TYPE = "Biopsy type",
    FLOW_STARTED_AT = "Flow started",
    FLOW_COMPLETED_AT = "Flow completed",
    COLLECTED_AT = "Collected",
    SAMPLE_TYPE = "Sample",
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

export const openSampleCreateDialog = (biopsyUuid: string, editExisting?: PropertiedResource) =>
    (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        if (editExisting) {
            dispatch(initialize(SAMPLE_CREATE_FORM_NAME,
                {
                    biopsyUuid,
                    sampleType: editExisting.properties[sampleTrackerSampleType],
                    timePoint: editExisting.properties[sampleTrackerTimePoint],
                    aliquot: editExisting.properties[sampleTrackerAliquot],
                    sentForSequencing: editExisting.properties[sampleTrackerSentForSequencingAt],
                    sequencingCompleted: editExisting.properties[sampleTrackerSequencingCompletedAt],
                    state: editExisting.properties[sampleTrackerState],
                    batchUuid: editExisting.properties[sampleTrackerBatchUuid],
                    uuidSelf: editExisting.uuid,
                }));
        } else {
            dispatch(initialize(SAMPLE_CREATE_FORM_NAME,
                {
                    biopsyUuid,
                    additionalId: 1,
                    state: AnalysisState.NEW
                }));
        }
        dispatch(dialogActions.OPEN_DIALOG({
            id: SAMPLE_CREATE_FORM_NAME, data: { updating: editExisting !== undefined, }
        }));
    };

export const SampleComponent = connect((state: RootState, props: { resource: PropertiedResource }) => props)(
    (props: { resource: PropertiedResource } & DispatchProp<any>) =>
        <Typography color="primary" style={{ width: 'auto', cursor: 'pointer' }}
            onClick={() => props.dispatch<any>(openSampleCreateDialog(props.resource.properties["sample_tracker:biopsy_uuid"], props.resource))}
        >{props.resource.name}</Typography>);

export const openBiopsyCreateDialog = (patientUuid: string, editExisting?: PropertiedResource) =>
    (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        if (editExisting) {
            dispatch(initialize(BIOPSY_CREATE_FORM_NAME, {
                patientUuid,
                collectionType: editExisting.properties[sampleTrackerCollectionType],
                biopsyType: editExisting.properties[sampleTrackerBiopsyType],
                collectedAt: editExisting.properties[sampleTrackerCollectedAt],
                timePoint: editExisting.properties[sampleTrackerTimePoint],
                flowStartedAt: editExisting.properties[sampleTrackerFlowStartedAt],
                flowCompletedAt: editExisting.properties[sampleTrackerFlowCompletedAt]
            }));
        } else {
            dispatch(initialize(BIOPSY_CREATE_FORM_NAME, { patientUuid }));
        }
        dispatch(dialogActions.OPEN_DIALOG({ id: BIOPSY_CREATE_FORM_NAME, data: { updating: editExisting !== undefined } }));
    };

export const BiopsyComponent = connect((state: RootState, props: { resource: PropertiedResource }) => props)(
    (props: { resource: PropertiedResource } & DispatchProp<any>) =>
        <Typography color="primary" style={{ width: 'auto', cursor: 'pointer' }}
            onClick={() => props.dispatch<any>(openBiopsyCreateDialog(props.resource.properties["sample_tracker:biopsy_uuid"], props.resource))}
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
        const reverse = getProperty<{ [key: string]: any[] }>(PATIENT_PANEL_BIOPSIES)(state.properties);
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

export const biopsyListPanelColumns: DataColumns<string> = [
    {
        name: BiopsyPanelColumnNames.BIOPSY_TYPE,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <ResourceComponent uuid={uuid}
            render={rsc => <PropertyComponent resource={rsc} propertyname="sample_tracker:biopsy_type" />} />
    },
    {
        name: BiopsyPanelColumnNames.TIME_POINT,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <ResourceComponent uuid={uuid}
            render={rsc => <PropertyComponent resource={rsc} propertyname="sample_tracker:time_point" />} />
    },
    {
        name: BiopsyPanelColumnNames.COLLECTED_AT,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <TimestampComponent uuid={uuid} propertyname="sample_tracker:collected_at" />
    },
    {
        name: BiopsyPanelColumnNames.NAME,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <ResourceComponent uuid={uuid}
            render={rsc => <BiopsyComponent resource={rsc} />} />
    },
    {
        name: BiopsyPanelColumnNames.FLOW_STARTED_AT,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <TimestampComponent uuid={uuid} propertyname="sample_tracker:flow_started_at" />
    },
    {
        name: BiopsyPanelColumnNames.FLOW_COMPLETED_AT,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <TimestampComponent uuid={uuid} propertyname="sample_tracker:flow_completed_at" />
    },
    {
        name: BiopsyPanelColumnNames.SAMPLE_TYPE,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <MultiResourceComponent uuid={uuid.substr(biopsyBaseRoutePath.length + 1)}
            render={rsc => <SampleComponent resource={rsc} />} />
    },
    {
        name: BiopsyPanelColumnNames.BATCH_ID,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <MultiResourceComponent uuid={uuid.substr(biopsyBaseRoutePath.length + 1)}
            render={rsc => <ResourceComponent uuid={rsc.properties["sample_tracker:batch_uuid"]}
                render={rsc2 => <span>{rsc2.name}</span>} />} />
    },
    {
        name: BiopsyPanelColumnNames.TRACKER_STATE,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <MultiResourceComponent uuid={uuid.substr(biopsyBaseRoutePath.length + 1)}
            render={rsc => <PropertyComponent resource={rsc} propertyname="sample_tracker:state" />} />
    },
    {
        name: BiopsyPanelColumnNames.WORKFLOW_STATE,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <MultiResourceComponent uuid={uuid.substr(biopsyBaseRoutePath.length + 1)}
            render={rsc => <RunProcessComponent resource={rsc} />} />
    },
];

const setItems = (listResults: ListResults<LinkResource>) =>
    biopsyListPanelActions.SET_ITEMS({
        ...listResultsToDataExplorerItemsMeta(listResults),
        items: listResults.items.map(resource => resource.uuid),
    });

const getBiopsyFilters = (dataExplorer: DataExplorerState, patientUuid: string) => {
    const fb = new FilterBuilder();
    fb.addEqual("owner_uuid", patientUuid);
    fb.addEqual("link_class", sampleTrackerBiopsy);

    const nameFilters = new FilterBuilder()
        .addILike("name", dataExplorer.searchValue)
        .getFilters();

    return joinFilters(
        fb.getFilters(),
        nameFilters,
    );
};

const getBiopsyParams = (dataExplorer: DataExplorerState, patientUuid: string) => ({
    ...dataExplorerToListParams(dataExplorer),
    filters: getBiopsyFilters(dataExplorer, patientUuid),
});


const getSampleFilters = (dataExplorer: DataExplorerState, patientUuid: string) => {
    const fb = new FilterBuilder();
    fb.addEqual("owner_uuid", patientUuid);
    fb.addEqual("properties.type", sampleTrackerSample);

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

export class BiopsyListPanelMiddlewareService extends DataExplorerMiddlewareService {
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
            const response = await this.services.linkService.list(getBiopsyParams(dataExplorer, patientUuid));
            const response2 = await this.services.groupsService.list(getSampleParams(dataExplorer, patientUuid));
            api.dispatch(progressIndicatorActions.PERSIST_STOP_WORKING(this.getId()));

            const reverse = {};
            const batches = [];
            for (const i of response2.items) {
                const sid = i.properties["sample_tracker:biopsy_uuid"];
                const lst = reverse[sid] || [];
                lst.push(i.uuid);
                reverse[sid] = lst;
                const batch = i.properties["sample_tracker:batch_uuid"];
                if (batch) {
                    batches.push(batch);
                }
            }
            api.dispatch(propertiesActions.SET_PROPERTY({ key: PATIENT_PANEL_BIOPSIES, value: reverse }));

            const response3 = await this.services.groupsService.list({
                filters: new FilterBuilder()
                    .addIn("uuid", batches)
                    .getFilters()
            });

            api.dispatch(updateResources(response.items));

            for (const i of response.items) {
                i.uuid = biopsyBaseRoutePath + "/" + i.uuid;
            }
            api.dispatch(updateResources(response.items));
            api.dispatch(updateResources(response2.items));
            api.dispatch(updateResources(response3.items));
            api.dispatch(setItems(response));
        } catch (e) {
            api.dispatch(progressIndicatorActions.PERSIST_STOP_WORKING(this.getId()));
            api.dispatch(biopsyListPanelActions.SET_ITEMS({
                items: [],
                itemsAvailable: 0,
                page: 0,
                rowsPerPage: dataExplorer.rowsPerPage
            }));
            // api.dispatch(couldNotFetchProjectContents());
        }
    }
}
