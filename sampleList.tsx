// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { WithDialogProps } from '~/store/dialog/with-dialog';
import { FormDialog } from '~/components/form-dialog/form-dialog';
import { dialogActions } from "~/store/dialog/dialog-actions";
import { ServiceRepository } from "~/services/services";
import { compose, MiddlewareAPI, Dispatch } from "redux";
import { reduxForm, initialize, WrappedFieldProps, InjectedFormProps, Field, reset, startSubmit } from 'redux-form';
import { withDialog } from "~/store/dialog/with-dialog";
import { RootState } from '~/store/store';
import { DispatchProp, connect } from 'react-redux';
import { DataExplorer } from "~/views-components/data-explorer/data-explorer";
import { DataTableDefaultView } from '~/components/data-table-default-view/data-table-default-view';
import { DataColumns } from '~/components/data-table/data-table';
import { createTree } from '~/models/tree';
import { ResourceName } from '~/views-components/data-explorer/renderers';
import { SortDirection } from '~/components/data-table/data-column';
import { bindDataExplorerActions } from "~/store/data-explorer/data-explorer-action";
import { TextField } from "~/components/text-field/text-field";
import { FormControl, InputLabel } from '@material-ui/core';
import { withStyles, WithStyles } from '@material-ui/core/styles';

import {
    DataExplorerMiddlewareService,
    listResultsToDataExplorerItemsMeta,
    dataExplorerToListParams
} from '~/store/data-explorer/data-explorer-middleware-service';
import { GroupResource } from "~/models/group";
import { LinkResource } from "~/models/link";
import { ListResults } from '~/services/common-service/common-service';
import { progressIndicatorActions } from '~/store/progress-indicator/progress-indicator-actions.ts';
import { DataExplorer as DataExplorerState, getDataExplorer } from '~/store/data-explorer/data-explorer-reducer';
import { FilterBuilder, joinFilters } from "~/services/api/filter-builder";
import { updateResources } from "~/store/resources/resources-actions";
import {
    patientRoutePath, patientBaseRoutePath
} from './patientList';
import { matchPath } from "react-router";
import { getProperty } from '~/store/properties/properties';
import { MenuItem, Select } from '@material-ui/core';
import { ArvadosTheme } from '~/common/custom-theme';
import { getResource } from "~/store/resources/resources";

const SAMPLE_CREATE_FORM_NAME = "sampleCreateFormName";
export const SAMPLE_LIST_PANEL_ID = "sampleListPanel";
export const sampleListPanelActions = bindDataExplorerActions(SAMPLE_LIST_PANEL_ID);
export const sampleTrackerSampleType = "sample_tracker:sample";
export const PATIENT_PANEL_CURRENT_UUID = "PatientPanelCurrentUUID";
export const SAMPLE_PANEL_CURRENT_UUID = "SamplePanelCurrentUUID";
export const sampleBaseRoutePath = "/SampleTracker/Sample";
export const sampleRoutePath = sampleBaseRoutePath + "/:uuid";

export interface SampleCreateFormDialogData {
    patientUuid: string;
    collectionType: string;
    sampleType: string;
    collectedAt: string;
    timePoint: number;
    flowStartedAt: string;
    flowCompletedAt: string;
}

type DialogSampleProps = WithDialogProps<{}> & InjectedFormProps<SampleCreateFormDialogData>;

type CssRules = 'selectWidth';

const styles = withStyles<CssRules>((theme: ArvadosTheme) => ({
    selectWidth: {
        width: theme.spacing.unit * 20,
    }
}));

enum CollectionType {
    PERIPHERAL_BLOOD = 'peripheral_blood',
    BONE_MARROW = 'bone_marrow'
}

enum SampleType {
    TUMOR = 'tumor',
    NORMAL = 'normal'
}

export const CollectionTypeSelect = styles(
    ({ classes, input }: WrappedFieldProps & WithStyles<CssRules>) =>
        <FormControl className={classes.selectWidth}>
            <Select
                {...input}>
                <MenuItem value={CollectionType.PERIPHERAL_BLOOD}>
                    Peripheral Blood
		</MenuItem>
                <MenuItem value={CollectionType.BONE_MARROW}>
                    Bone Marrow
		</MenuItem>
            </Select>
        </FormControl>);

export const SampleTypeSelect = styles(
    ({ classes, input }: WrappedFieldProps & WithStyles<CssRules>) =>
        <FormControl className={classes.selectWidth}>
            <Select
                {...input}>
                <MenuItem value={SampleType.TUMOR}>
                    Tumor
		</MenuItem>
                <MenuItem value={SampleType.NORMAL}>
                    Normal
		</MenuItem>
            </Select>
        </FormControl>);

const SampleAddFields = () => <span>

    <InputLabel>Patient time point</InputLabel>
    <Field
        name='timePoint'
        component={TextField}
        type="number" />

    <InputLabel>Collection date</InputLabel>
    <Field
        name='collectedAt'
        component={TextField}
        type="date" />

    <InputLabel>Collection type</InputLabel>
    <div>
        <Field
            name='collectionType'
            component={CollectionTypeSelect} />
    </div>

    <InputLabel>Sample type</InputLabel>
    <div>
        <Field
            name='sampleType'
            component={SampleTypeSelect} />
    </div>
    <InputLabel>Flow started at</InputLabel>
    <Field
        name='flowStartedAt'
        component={TextField}
        type="date"
    />

    <InputLabel>Flow ended at</InputLabel>
    <Field
        name='flowEndedAt'
        component={TextField}
        type="date"
    />
</span>;

const DialogSampleCreate = (props: DialogSampleProps) =>
    <FormDialog
        dialogTitle='Add sample'
        formFields={SampleAddFields}
        submitLabel='Add a sample'
        {...props}
    />;

const makeSampleId = (data: SampleCreateFormDialogData, state: RootState): string => {
    const rsc = getResource<GroupResource>(patientBaseRoutePath + "/" + data.patientUuid)(state.resources);
    let id = rsc!.name;
    if (data.collectionType === CollectionType.PERIPHERAL_BLOOD) {
        id = id + "_PB";
    }
    if (data.collectionType === CollectionType.BONE_MARROW) {
        id = id + "_BM";
    }
    if (data.timePoint < 10) {
        id = id + "_0" + data.timePoint;
    } else {
        id = id + "_" + data.timePoint;
    }
    return id;
};

const createSample = (data: SampleCreateFormDialogData) =>
    async (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {

        dispatch(startSubmit(SAMPLE_CREATE_FORM_NAME));
        const sampleId = makeSampleId(data, getState());
        await services.linkService.create({
            ownerUuid: data.patientUuid,
            name: sampleId,
            linkClass: sampleTrackerSampleType,
            properties: {
                "sample_tracker:collection_type": data.collectionType,
                "sample_tracker:sample_type": data.sampleType,
                "sample_tracker:collected_at": data.collectedAt,
                "sample_tracker:time_point": data.timePoint,
                "sample_tracker:flow_started_at": data.flowStartedAt,
                "sample_tracker:flow_completed_at": data.flowCompletedAt,
            },
        });
        dispatch(dialogActions.CLOSE_DIALOG({ id: SAMPLE_CREATE_FORM_NAME }));
        dispatch(reset(SAMPLE_CREATE_FORM_NAME));
    };

export const CreateSampleDialog = compose(
    withDialog(SAMPLE_CREATE_FORM_NAME),
    reduxForm<SampleCreateFormDialogData>({
        form: SAMPLE_CREATE_FORM_NAME,
        onSubmit: (data, dispatch) => {
            dispatch(createSample(data));
        }
    })
)(DialogSampleCreate);

export interface MenuItemProps {
    className?: string;
    patientUuid?: string;
}

export interface PatientPathId {
    uuid: string;
}

export const samplesMapStateToProps = (state: RootState) => {
    const props: MenuItemProps = {};
    const patientid = matchPath<PatientPathId>(state.router.location!.pathname, { path: patientRoutePath, exact: true });
    if (patientid) {
        props.patientUuid = patientid.params.uuid;
    }
    return props;
};

const openSampleCreateDialog = (patientUuid: string) =>
    (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        dispatch(initialize(SAMPLE_CREATE_FORM_NAME, { patientUuid }));
        dispatch(dialogActions.OPEN_DIALOG({ id: SAMPLE_CREATE_FORM_NAME, data: {} }));
    };

export const AddSampleMenuComponent = connect<{}, {}, MenuItemProps>(samplesMapStateToProps)(
    ({ patientUuid, dispatch, className }: MenuItemProps & DispatchProp<any>) =>
        <MenuItem className={className} onClick={() => dispatch(openSampleCreateDialog(patientUuid!))} disabled={!patientUuid}>Add Sample</MenuItem >
);


enum SamplePanelColumnNames {
    NAME = "Name",
    TIME_POINT = "Time point",
    COLLECTION_TYPE = "Collection type",
    SAMPLE_TYPE = "Sample type",
    FLOW_STARTED_AT = "Flow started",
    FLOW_COMPLETED_AT = "Flow completed",
    COLLECTED_AT = "Collected",
    EXTRACTION_TYPE = "Extraction",
    SEQUENCING_SENT = "Sent for sequencing",
    SEQUENCING_COMPLETE = "Sequencing completed",
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

export const TextComponent = connect(
    (state: RootState, props: { uuid: string, propertyname: string }) => {
        const resource = getResource<LinkResource>(props.uuid)(state.resources);
        return { resource, propertyname: props.propertyname };
    })((props: { resource: LinkResource, propertyname: string } & DispatchProp<any>) => <span>{props.resource.properties[props.propertyname]}</span>);

export const sampleListPanelColumns: DataColumns<string> = [
    {
        name: SamplePanelColumnNames.NAME,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <ResourceName uuid={uuid} />
    },
    /*{
        name: SamplePanelColumnNames.TIME_POINT,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <TimePointComponent uuid={uuid} />
    },
    {
        name: SamplePanelColumnNames.COLLECTION_TYPE,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <CollectionTypeComponent uuid={uuid} />
    },*/
    {
        name: SamplePanelColumnNames.SAMPLE_TYPE,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <SampleTypeComponent uuid={uuid} />
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
        render: uuid => <span />
    },
    {
        name: SamplePanelColumnNames.SEQUENCING_SENT,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <span />
    },
    {
        name: SamplePanelColumnNames.SEQUENCING_COMPLETE,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <span />
    },
    {
        name: SamplePanelColumnNames.TRACKER_STATE,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <span />
    },
    {
        name: SamplePanelColumnNames.BATCH_ID,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <span />
    }
];

export interface TrackerProps {
    className?: string;
}

export const SampleListPanel = connect(samplesMapStateToProps)(
    ({ }: TrackerProps) =>
        <DataExplorer
            id={SAMPLE_LIST_PANEL_ID}
            onRowClick={(uuid: string) => { }}
            onRowDoubleClick={(uuid: string) => { }}
            onContextMenu={(event: React.MouseEvent<HTMLElement>, resourceUuid: string) => { }}
            contextMenuColumn={true}
            dataTableDefaultView={
                <DataTableDefaultView />
            } />);

const setItems = (listResults: ListResults<LinkResource>) =>
    sampleListPanelActions.SET_ITEMS({
        ...listResultsToDataExplorerItemsMeta(listResults),
        items: listResults.items.map(resource => resource.uuid),
    });

const getFilters = (dataExplorer: DataExplorerState, patientUuid: string) => {
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

const getParams = (dataExplorer: DataExplorerState, patientUuid: string) => ({
    ...dataExplorerToListParams(dataExplorer),
    filters: getFilters(dataExplorer, patientUuid),
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
            const response = await this.services.linkService.list(getParams(dataExplorer, patientUuid));
            api.dispatch(progressIndicatorActions.PERSIST_STOP_WORKING(this.getId()));
            for (const i of response.items) {
                i.uuid = sampleBaseRoutePath + "/" + i.uuid;
            }
            api.dispatch(updateResources(response.items));
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
