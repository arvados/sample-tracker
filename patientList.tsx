// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { InjectedFormProps } from 'redux-form';
import { WithDialogProps } from '~/store/dialog/with-dialog';
import { ProjectCreateFormDialogData } from '~/store/projects/project-create-actions';
import { FormDialog } from '~/components/form-dialog/form-dialog';
import { ProjectNameField } from '~/views-components/form-fields/project-form-fields';
import { dialogActions } from "~/store/dialog/dialog-actions";
import { ServiceRepository } from "~/services/services";
import { compose, MiddlewareAPI, Dispatch } from "redux";
import { reduxForm, initialize } from 'redux-form';
import { withDialog } from "~/store/dialog/with-dialog";
import { RootState } from '~/store/store';
import { DispatchProp, connect } from 'react-redux';
import { MenuItem } from "@material-ui/core";
import { createProject } from "~/store/workbench/workbench-actions";
import { DataExplorer } from "~/views-components/data-explorer/data-explorer";
import { DataTableDefaultView } from '~/components/data-table-default-view/data-table-default-view';
import { DataColumns } from '~/components/data-table/data-table';
import { createTree } from '~/models/tree';
import { ResourceName } from '~/views-components/data-explorer/renderers';
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
import {
    studyRoutePath
} from './studyList';
import { matchPath } from "react-router";
import { getProperty } from '~/store/properties/properties';

const PATIENT_CREATE_FORM_NAME = "patientCreateFormName";
export const PATIENT_LIST_PANEL_ID = "patientListPanel";
export const patientListPanelActions = bindDataExplorerActions(PATIENT_LIST_PANEL_ID);
export const sampleTrackerPatientType = "sample_tracker:patient";
export const STUDY_PANEL_CURRENT_UUID = "StudyPanelCurrentUUID";
export const PATIENT_PANEL_CURRENT_UUID = "PatientPanelCurrentUUID";
export const patientBaseRoutePath = "/SampleTracker/Patient";
export const patientRoutePath = patientBaseRoutePath + "/:uuid";

export interface ProjectCreateFormDialogData {
    ownerUuid: string;
    name: string;
    description: string;
}

type DialogProjectProps = WithDialogProps<{}> & InjectedFormProps<ProjectCreateFormDialogData>;

const PatientAddFields = () => <span>
    <ProjectNameField label="Patient anonymized identifier" />
</span>;

const DialogPatientCreate = (props: DialogProjectProps) =>
    <FormDialog
        dialogTitle='Add patient'
        formFields={PatientAddFields}
        submitLabel='Add a patient'
        {...props}
    />;

export const CreatePatientDialog = compose(
    withDialog(PATIENT_CREATE_FORM_NAME),
    reduxForm<ProjectCreateFormDialogData>({
        form: PATIENT_CREATE_FORM_NAME,
        onSubmit: (data, dispatch) => {
            data.properties = { type: sampleTrackerPatientType };
            dispatch(createProject(data));
        }
    })
)(DialogPatientCreate);

export interface MenuItemProps {
    className?: string;
    studyUuid?: string;
}

export interface StudyPathId {
    uuid: string;
}

export const patientsMapStateToProps = (state: RootState) => {
    const props: MenuItemProps = {};
    const studyid = matchPath<StudyPathId>(state.router.location!.pathname, { path: studyRoutePath, exact: true });
    if (studyid) {
        props.studyUuid = studyid.params.uuid;
    }
    return props;
};

const openPatientCreateDialog = (studyUuid: string) =>
    (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        dispatch(initialize(PATIENT_CREATE_FORM_NAME, { ownerUuid: studyUuid }));
        dispatch(dialogActions.OPEN_DIALOG({ id: PATIENT_CREATE_FORM_NAME, data: {} }));
    };

export const AddPatientMenuComponent = connect<{}, {}, MenuItemProps>(patientsMapStateToProps)(
    ({ studyUuid, dispatch, className }: MenuItemProps & DispatchProp<any>) =>
        <MenuItem className={className} onClick={() => dispatch(openPatientCreateDialog(studyUuid!))} disabled={!studyUuid}>Add Patient</MenuItem >
);


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

export interface TrackerProps {
    className?: string;
}

export const PatientListPanel = connect(patientsMapStateToProps)(
    ({ }: TrackerProps) =>
        <DataExplorer
            id={PATIENT_LIST_PANEL_ID}
            onRowClick={(uuid: string) => { }}
            onRowDoubleClick={(uuid: string) => { }}
            onContextMenu={(event: React.MouseEvent<HTMLElement>, resourceUuid: string) => { }}
            contextMenuColumn={true}
            dataTableDefaultView={
                <DataTableDefaultView />
            } />);

const setItems = (listResults: ListResults<GroupResource>) =>
    patientListPanelActions.SET_ITEMS({
        ...listResultsToDataExplorerItemsMeta(listResults),
        items: listResults.items.map(resource => resource.uuid),
    });

const getFilters = (dataExplorer: DataExplorerState, studyUuid: string) => {
    const fb = new FilterBuilder();
    fb.addEqual("owner_uuid", studyUuid);
    fb.addEqual("properties.type", sampleTrackerPatientType);

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
