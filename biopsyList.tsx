// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { ServiceRepository } from "services/services";
import { MiddlewareAPI, Dispatch } from "redux";
import { RootState } from 'store/store';
import { DispatchProp, connect } from 'react-redux';
import { DataColumns } from 'components/data-table/data-table';
import { createTree } from 'models/tree';
import { SortDirection } from 'components/data-table/data-column';
import { bindDataExplorerActions } from "store/data-explorer/data-explorer-action";
import { Typography } from '@material-ui/core';
import { initialize } from 'redux-form';
import { dialogActions } from "store/dialog/dialog-actions";

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
import { updateResources } from "store/resources/resources-actions";
import { getProperty } from 'store/properties/properties';
import { getResource } from "store/resources/resources";
import { propertiesActions } from "store/properties/properties-actions";
import { loadResource } from "store/resources/resources-actions";

import {
    ResourceComponent, MultiResourceComponent,
    PropertiedResource, PropertyComponent
} from "./resource-component";
import { RunProcessComponent } from "./run-process";
import {
    sampleTrackerBiopsy, sampleTrackerSample, sampleTrackerAliquot,
    sampleTrackerState, sampleTrackerCollectionType, sampleTrackerBiopsyType,
    sampleTrackerCollectedAt, sampleTrackerTimePoint,
    sampleTrackerSentForSequencingAt,
    sampleTrackerSequencingCompletedAt, sampleTrackerBatchId, sampleTrackerSampleType,
    sampleTrackerBiopsyUuid, AnalysisState, sampleTrackerBiopsyRedcapId
} from './metadataTerms';
import {
    STUDY_PANEL_CURRENT_UUID, PATIENT_PANEL_CURRENT_UUID
} from './patientList';

export const BIOPSY_LIST_PANEL_ID = "biopsyListPanel";
export const biopsyListPanelActions = bindDataExplorerActions(BIOPSY_LIST_PANEL_ID);

export const BIOPSY_PANEL_CURRENT_UUID = "BiopsyPanelCurrentUUID";
export const biopsyBaseRoutePath = "/BiopsyTracker/Biopsy";
export const biopsyRoutePath = biopsyBaseRoutePath + "/:uuid";

export const SAMPLE_CREATE_FORM_NAME = "sampleCreateFormName";
const PATIENT_PANEL_BIOPSIES = "PATIENT_PANEL_BIOPSIES";
export const BIOPSY_CREATE_FORM_NAME = "biopsyCreateFormName";
export const SAMPLES_TO_WORKFLOW_RUNS = "SAMPLES_TO_WORKFLOW_RUNS";


enum BiopsyPanelColumnNames {
    NAME = "Name",
    TIME_POINT = "Time point",
    COLLECTION_TYPE = "Collection type",
    BIOPSY_TYPE = "Biopsy type",
    SENT_FOR_SEQUENCING_AT = "Sent for sequencing",
    SEQUENCING_COMPLETED_AT = "Sequencing completed",
    COLLECTED_AT = "Collected",
    SAMPLE_ID = "Sample",
    TRACKER_STATE = "State",
    BATCH_ID = "Batch",
    WORKFLOW_STATE = "Workflow State",
}

export const TimestampComponent = connect(
    (state: RootState, props: { uuid: string, propertyname: string }) => {
        const resource = getResource<PropertiedResource>(props.uuid)(state.resources);
        console.log(`grarg ${props.uuid} ${resource} ${props.propertyname}`);
        return { resource, propertyname: props.propertyname };
    })((props: { resource: PropertiedResource, propertyname: string } & DispatchProp<any>) => <span>{props.resource && props.resource.properties[props.propertyname]}</span>);

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
                    batchId: editExisting.properties[sampleTrackerBatchId],
                    uuidSelf: editExisting.uuid
                }));
        } else {
            dispatch(initialize(SAMPLE_CREATE_FORM_NAME,
                {
                    biopsyUuid,
                    aliquot: 1,
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
            onClick={() => props.dispatch<any>(openSampleCreateDialog(props.resource.properties[sampleTrackerBiopsyUuid], props.resource))}
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
                redcapId: editExisting.properties[sampleTrackerBiopsyRedcapId],
                biopsyUuid: editExisting.uuid.substr(biopsyBaseRoutePath.length + 1),
            }));
        } else {
            dispatch(initialize(BIOPSY_CREATE_FORM_NAME, { patientUuid }));
        }
        dispatch(dialogActions.OPEN_DIALOG({ id: BIOPSY_CREATE_FORM_NAME, data: { updating: editExisting !== undefined } }));
    };

export const BiopsyComponent = connect((state: RootState, props: { resource: PropertiedResource }) => props)(
    (props: { resource: PropertiedResource } & DispatchProp<any>) =>
        <Typography color="primary" style={{ width: 'auto', cursor: 'pointer' }}
            onClick={() => props.dispatch<any>(openBiopsyCreateDialog(props.resource.ownerUuid, props.resource))}
        >{props.resource.name}</Typography>);


export const biopsyListPanelColumns: DataColumns<string> = [
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
        name: BiopsyPanelColumnNames.COLLECTION_TYPE,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <ResourceComponent uuid={uuid}
            render={rsc => <PropertyComponent resource={rsc} propertyname={sampleTrackerCollectionType} />} />
    },
    {
        name: BiopsyPanelColumnNames.BIOPSY_TYPE,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <ResourceComponent uuid={uuid}
            render={rsc => <PropertyComponent resource={rsc} propertyname={sampleTrackerBiopsyType} />} />
    },
    {
        name: BiopsyPanelColumnNames.TIME_POINT,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <ResourceComponent uuid={uuid}
            render={rsc => <PropertyComponent resource={rsc} propertyname={sampleTrackerTimePoint} />} />
    },
    {
        name: BiopsyPanelColumnNames.COLLECTED_AT,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <TimestampComponent uuid={uuid} propertyname={sampleTrackerCollectedAt} />
    },
    {
        name: BiopsyPanelColumnNames.SAMPLE_ID,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <MultiResourceComponent uuid={uuid.substr(biopsyBaseRoutePath.length + 1)}
            lookupProperty={PATIENT_PANEL_BIOPSIES}
            render={rsc => <SampleComponent resource={rsc} />} />
    },
    {
        name: BiopsyPanelColumnNames.TRACKER_STATE,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <MultiResourceComponent uuid={uuid.substr(biopsyBaseRoutePath.length + 1)}
            lookupProperty={PATIENT_PANEL_BIOPSIES}
            render={rsc => <PropertyComponent resource={rsc} propertyname={sampleTrackerState} />} />
    },
    {
        name: BiopsyPanelColumnNames.SENT_FOR_SEQUENCING_AT,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <MultiResourceComponent uuid={uuid.substr(biopsyBaseRoutePath.length + 1)}
            lookupProperty={PATIENT_PANEL_BIOPSIES}
            render={rsc => <TimestampComponent uuid={rsc.uuid} propertyname={sampleTrackerSentForSequencingAt} />} />
    },
    {
        name: BiopsyPanelColumnNames.SEQUENCING_COMPLETED_AT,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <MultiResourceComponent uuid={uuid.substr(biopsyBaseRoutePath.length + 1)}
            lookupProperty={PATIENT_PANEL_BIOPSIES}
            render={rsc => <TimestampComponent uuid={rsc.uuid} propertyname={sampleTrackerSequencingCompletedAt} />} />
    },
    {
        name: BiopsyPanelColumnNames.BATCH_ID,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <MultiResourceComponent uuid={uuid.substr(biopsyBaseRoutePath.length + 1)}
            lookupProperty={PATIENT_PANEL_BIOPSIES}
            // render={rsc => <ResourceComponent uuid={rsc.properties[sampleTrackerBatchId]}
            // 				       render={rsc2 => <span>{rsc2.name}</span>} />}
            render={rsc => <span>{rsc.properties[sampleTrackerBatchId]}</span>}
        />
    },
];

const setItems = (listResults: ListResults<GroupResource>) =>
    biopsyListPanelActions.SET_ITEMS({
        ...listResultsToDataExplorerItemsMeta(listResults),
        items: listResults.items.map(resource => resource.uuid),
    });

const getBiopsyFilters = (dataExplorer: DataExplorerState, patientUuid: string) => {
    const fb = new FilterBuilder();
    fb.addEqual("owner_uuid", patientUuid);
    fb.addEqual("properties.type", sampleTrackerBiopsy);

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

        const studyUuid = getProperty<string>(STUDY_PANEL_CURRENT_UUID)(state.properties);
        const patientUuid = getProperty<string>(PATIENT_PANEL_CURRENT_UUID)(state.properties);

        if (!patientUuid) {
            return;
        }

        loadResource(patientUuid);

        try {
            api.dispatch(progressIndicatorActions.START_WORKING(this.getId()));
            const response = await this.services.groupsService.list(getBiopsyParams(dataExplorer, patientUuid));
            const response2 = await this.services.collectionService.list(getSampleParams(dataExplorer, patientUuid));
            const responseContainerRequests = await this.services.containerRequestService.list({
                filters: (new FilterBuilder().addIn("owner_uuid", response2.items.map(s => s.uuid)).addEqual("requesting_container_uuid", null)).getFilters(),
                order: "created_at desc"
            });
            const responseContainers = await this.services.containerService.list({
                filters: (new FilterBuilder().addIn("uuid", responseContainerRequests.items.filter(s => s != null).map(s => s.containerUuid!))).getFilters()
            });
            api.dispatch(progressIndicatorActions.PERSIST_STOP_WORKING(this.getId()));

            const reverse = {};
            const batches: any[] = [];
            for (const i of response2.items) {
                for (const j of response.items) {
                    if (i.name.startsWith(j.name)) {
                        const sid = j.uuid;
                        const lst = reverse[sid] || [];
                        lst.push(i.uuid);
                        reverse[sid] = lst;
                        break;
                    }
                }

                const batch = i.properties[sampleTrackerBatchId];
                if (batch) {
                    batches.push(batch);
                }
            }
            api.dispatch(propertiesActions.SET_PROPERTY({ key: PATIENT_PANEL_BIOPSIES, value: reverse }));

            const samplesToWf = {};
            for (const i of response2.items) {
                for (const j of responseContainerRequests.items) {
                    if (i.uuid === j.ownerUuid) {
                        samplesToWf[i.uuid] = j;
                        break;
                    }
                }
            }
            api.dispatch(propertiesActions.SET_PROPERTY({ key: SAMPLES_TO_WORKFLOW_RUNS, value: samplesToWf }));

            const response3 = await this.services.groupsService.list({
                filters: new FilterBuilder()
                    .addEqual("owner_uuid", studyUuid)
                    .addIn("name", batches)
                    .getFilters()
            });

            api.dispatch(updateResources(response.items));

            for (const i of response.items) {
                i.uuid = biopsyBaseRoutePath + "/" + i.uuid;
            }
            api.dispatch(updateResources(response.items));
            api.dispatch(updateResources(response2.items));
            api.dispatch(updateResources(response3.items));
            api.dispatch(updateResources(responseContainerRequests.items));
            api.dispatch(updateResources(responseContainers.items));
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
