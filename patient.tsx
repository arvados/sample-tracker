// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { DispatchProp, connect } from 'react-redux';
import { compose, Dispatch } from "redux";
import { propertiesActions } from "~/store/properties/properties-actions";
import { getProperty } from '~/store/properties/properties';
import { RootState } from '~/store/store';
import { DataExplorer } from "~/views-components/data-explorer/data-explorer";
import { DataTableDefaultView } from '~/components/data-table-default-view/data-table-default-view';
import { openContextMenu } from '~/store/context-menu/context-menu-actions';
import { ResourceKind } from '~/models/resource';
import { ContextMenuActionSet } from "~/views-components/context-menu/context-menu-action-set";
import { openExtractionCreateDialog } from "./extraction";
import { InjectedFormProps, reduxForm, initialize } from 'redux-form';
import { WithDialogProps } from '~/store/dialog/with-dialog';
import { ProjectCreateFormDialogData } from '~/store/projects/project-create-actions';
import { FormDialog } from '~/components/form-dialog/form-dialog';
import { ProjectNameField } from '~/views-components/form-fields/project-form-fields';
import { dialogActions } from "~/store/dialog/dialog-actions";
import { withDialog } from "~/store/dialog/with-dialog";
import { MenuItem } from "@material-ui/core";
import { createProject } from "~/store/workbench/workbench-actions";
import { matchPath } from "react-router";
import { ServiceRepository } from "~/services/services";

import { PATIENT_PANEL_CURRENT_UUID, sampleTrackerPatientType } from './patientList';
import {
    SAMPLE_LIST_PANEL_ID, sampleListPanelActions,
    sampleBaseRoutePath, sampleListPanelColumns
} from './sampleList';
import { studyRoutePath } from './studyList';

export const PATIENT_SAMPLE_MENU = "Sample Tracker - Patient Sample menu";
const PATIENT_CREATE_FORM_NAME = "patientCreateFormName";

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

export const openPatientPanel = (projectUuid: string) =>
    (dispatch: Dispatch) => {
        dispatch(sampleListPanelActions.SET_COLUMNS({ columns: sampleListPanelColumns }));
        dispatch(propertiesActions.SET_PROPERTY({ key: PATIENT_PANEL_CURRENT_UUID, value: projectUuid }));
        dispatch(sampleListPanelActions.REQUEST_ITEMS());
    };

interface PatientProps {
    patientUuid: string;
}

export const patientMapStateToProps = (state: RootState) => ({
    patientUuid: getProperty(PATIENT_PANEL_CURRENT_UUID)(state.properties),
});

const handleContextMenu = (dispatch: Dispatch) =>
    (event: React.MouseEvent<HTMLElement>, resourceUuid: string) => {
        // const { resources } = this.props;
        // const resource = getResource<GroupContentsResource>(resourceUuid)(resources);
        // const menuKind = this.props.dispatch<any>(resourceUuidToContextMenuKind(resourceUuid));
        dispatch<any>(openContextMenu(event, {
            name: "",
            uuid: resourceUuid,
            ownerUuid: "",
            isTrashed: false,
            kind: ResourceKind.NONE,
            menuKind: PATIENT_SAMPLE_MENU
        }));
    };


export const patientSampleActionSet: ContextMenuActionSet = [[
    {
        name: "Add extraction",
        execute: (dispatch, resource) => {
            dispatch<any>(openExtractionCreateDialog(resource.uuid.substr(sampleBaseRoutePath.length + 1)));
        }
    },
]];

export const PatientMainPanel = connect(patientMapStateToProps)(
    ({ dispatch, patientUuid }: PatientProps & DispatchProp<any>) =>
        <div>
            <DataExplorer
                id={SAMPLE_LIST_PANEL_ID}
                hideSearchInput={true}
                hideColumnSelector={true}
                onRowClick={(uuid: string) => { }}
                onRowDoubleClick={(uuid: string) => { }}
                onContextMenu={handleContextMenu(dispatch)}
                contextMenuColumn={true}
                dataTableDefaultView={
                    <DataTableDefaultView />
                } />
        </div>);
