// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { DispatchProp, connect } from 'react-redux';
import { compose, Dispatch } from "redux";
import { propertiesActions } from "store/properties/properties-actions";
import { getProperty } from 'store/properties/properties';
import { RootState } from 'store/store';
import { DataExplorer } from "views-components/data-explorer/data-explorer";
import { DataTableDefaultView } from 'components/data-table-default-view/data-table-default-view';
import { openContextMenu } from 'store/context-menu/context-menu-actions';
import { ResourceKind } from 'models/resource';
import { ContextMenuActionSet } from "views-components/context-menu/context-menu-action-set";
import { InjectedFormProps, reduxForm, Field, initialize, reset, startSubmit } from 'redux-form';
import { WithDialogProps } from 'store/dialog/with-dialog';
import { ProjectCreateFormDialogData } from 'store/projects/project-create-actions';
import { FormDialog } from 'components/form-dialog/form-dialog';
import { ProjectNameField } from 'views-components/form-fields/project-form-fields';
import { dialogActions } from "store/dialog/dialog-actions";
import { withDialog } from "store/dialog/with-dialog";
import { MenuItem, InputLabel } from "@material-ui/core";
import { matchPath } from "react-router";
import { ServiceRepository } from "services/services";
import { FilterBuilder } from "services/api/filter-builder";
import { getResource } from "store/resources/resources";
import { GroupResource } from "models/group";
import { PropertiedResource } from "./resource-component";
import { TextField } from "components/text-field/text-field";
import {
    loadSidePanelTreeProjects,
} from 'store/side-panel-tree/side-panel-tree-actions';
import * as projectCreateActions from 'store/projects/project-create-actions';

import { PATIENT_PANEL_CURRENT_UUID } from './patientList';
import {
    sampleTrackerPatient, sampleTrackerPatientName, sampleTrackerPatientMRN,
    sampleTrackerPatientDOB, sampleTrackerPatientPhysician, sampleTrackerStudyPrefix
} from './metadataTerms';
import {
    BIOPSY_LIST_PANEL_ID, biopsyListPanelActions,
    biopsyBaseRoutePath, biopsyListPanelColumns,
    openSampleCreateDialog
} from './biopsyList';
import { studyRoutePath } from './studyList';
import { patientBaseRoutePath, patientListPanelActions } from './patientList';

export const PATIENT_BIOPSY_MENU = "Biopsy Tracker - Patient Biopsy menu";
const PATIENT_CREATE_FORM_NAME = "patientCreateFormName";

export interface PatientCreateFormDialogData {
    ownerUuid: string;
    uuid: string;
    description: string;
    name: string;
    patientName: string;
    MRN: string;
    DOB: string;
    physician: string;
}

type DialogProjectProps = WithDialogProps<{ updating: boolean }> & InjectedFormProps<PatientCreateFormDialogData>;

const PatientAddFields = () => <span>
    <ProjectNameField label="Patient anonymized identifier" />
    <InputLabel>Patient Name</InputLabel>
    <Field
        name='patientName'
        component={TextField as any}
    />
    <InputLabel>Medical Record Number (MRN)</InputLabel>
    <Field
        name='MRN'
        component={TextField as any}
    />
    <InputLabel>Date of Birth (YYYY-MM-DD)</InputLabel>
    <Field
        name='DOB'
        component={TextField as any}
        type="date"
    />
    <InputLabel>Treating Physician</InputLabel>
    <Field
        name='physician'
        component={TextField as any}
    />
</span>;

const DialogPatientCreate = (props: DialogProjectProps) =>
    <FormDialog
        dialogTitle={props.data.updating ? "Update Patient information" : 'Add Patient'}
        formFields={PatientAddFields}
        submitLabel={props.data.updating ? "Update Patient information" : 'Add Patient'}
        enableWhenPristine={true}
        {...props}
    />;

const createUpdatePatient = (data: PatientCreateFormDialogData) =>
    async (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        dispatch(startSubmit(PATIENT_CREATE_FORM_NAME));
        try {
            const g = {
                name: data.name,
                ownerUuid: data.ownerUuid,
                description: "",
                properties: {
                    [sampleTrackerPatientName]: data.patientName,
                    [sampleTrackerPatientMRN]: data.MRN,
                    [sampleTrackerPatientDOB]: data.DOB,
                    [sampleTrackerPatientPhysician]: data.physician,
                    type: sampleTrackerPatient,
                }
            };
            if (data.uuid) {
                await services.groupsService.update(data.uuid, g);
            } else {
                const newProject = await dispatch<any>(projectCreateActions.createProject(g));
                if (newProject) {
                    await dispatch<any>(loadSidePanelTreeProjects(newProject.ownerUuid));
                }
            }
        } finally {
            dispatch(dialogActions.CLOSE_DIALOG({ id: PATIENT_CREATE_FORM_NAME }));
            dispatch(reset(PATIENT_CREATE_FORM_NAME));
            dispatch(patientListPanelActions.REQUEST_ITEMS());
        }
    };

export const CreatePatientDialog = compose(
    withDialog(PATIENT_CREATE_FORM_NAME),
    reduxForm<ProjectCreateFormDialogData>({
        form: PATIENT_CREATE_FORM_NAME,
        onSubmit: (data, dispatch) => {
            dispatch(createUpdatePatient(data));
        }
    })
)(DialogPatientCreate);



export interface MenuItemProps {
    className?: string;
    studyUuid?: string;
    patientPrefix?: string;
}

export interface StudyPathId {
    uuid: string;
}

export const patientsMapStateToProps = (state: RootState) => {
    const props: MenuItemProps = {};
    const studyid = matchPath<StudyPathId>(state.router.location!.pathname, { path: studyRoutePath, exact: true });
    if (studyid) {
        const resource = getResource<GroupResource>(state.router.location!.pathname)(state.resources);
        if (resource) {
            props.studyUuid = studyid.params.uuid;
            props.patientPrefix = resource.properties[sampleTrackerStudyPrefix];
        }
    }
    return props;
};

const openPatientCreateDialog = (studyUuid?: string, patientPrefix?: string) =>
    async (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        if (!studyUuid || !patientPrefix) { return; }
        const results = await services.projectService.list({
            filters: new FilterBuilder().
                addEqual("properties.type", sampleTrackerPatient).
                addEqual("owner_uuid", studyUuid).
                getFilters()
        });
        let pid = "" + (results.itemsAvailable + 1);
        pid = "0".repeat(4 - pid.length) + pid;
        const name = patientPrefix + "_" + pid;
        dispatch(initialize(PATIENT_CREATE_FORM_NAME, { name, ownerUuid: studyUuid }));
        dispatch(dialogActions.OPEN_DIALOG({ id: PATIENT_CREATE_FORM_NAME, data: { updating: false } }));
    };

const openPatientEditDialog = (patientUuid: string) =>
    async (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        const patient = getResource<PropertiedResource>(patientUuid)(getState().resources);
        if (patient) {
            dispatch(initialize(PATIENT_CREATE_FORM_NAME, {
                uuid: patient.uuid.substr(patientBaseRoutePath.length + 1),
                ownerUuid: patient.ownerUuid,
                name: patient.name,
                patientName: patient.properties[sampleTrackerPatientName],
                MRN: patient.properties[sampleTrackerPatientMRN],
                DOB: patient.properties[sampleTrackerPatientDOB],
                physician: patient.properties[sampleTrackerPatientPhysician],
            }));
        }
        dispatch(dialogActions.OPEN_DIALOG({ id: PATIENT_CREATE_FORM_NAME, data: { updating: true } }));
    };

export const patientListActionSet: ContextMenuActionSet = [[
    {
        name: "Edit",
        execute: (dispatch, resource) => {
            dispatch<any>(openPatientEditDialog(resource.uuid));
        }
    },
]];

export const AddPatientMenuComponent = connect<{}, {}, MenuItemProps>(patientsMapStateToProps)(
    ({ studyUuid, patientPrefix, dispatch, className }: MenuItemProps & DispatchProp<any>) =>
        <MenuItem className={className} onClick={() => dispatch(openPatientCreateDialog(studyUuid, patientPrefix))} disabled={!studyUuid}>Add Patient</MenuItem >
);

export const openPatientPanel = (projectUuid: string) =>
    (dispatch: Dispatch) => {
        dispatch(biopsyListPanelActions.SET_COLUMNS({ columns: biopsyListPanelColumns }));
        dispatch(propertiesActions.SET_PROPERTY({ key: PATIENT_PANEL_CURRENT_UUID, value: projectUuid }));
        dispatch(biopsyListPanelActions.REQUEST_ITEMS());
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
            menuKind: PATIENT_BIOPSY_MENU
        }));
    };


export const patientBiopsyActionSet: ContextMenuActionSet = [[
    {
        name: "Add sample",
        execute: (dispatch, resource) => {
            dispatch<any>(openSampleCreateDialog(resource.uuid.substr(biopsyBaseRoutePath.length + 1)));
        }
    },
]];

export const PatientMainPanel = connect(patientMapStateToProps)(
    ({ dispatch, patientUuid }: PatientProps & DispatchProp<any>) =>
        <div>
            <DataExplorer
                id={BIOPSY_LIST_PANEL_ID}
                hideSearchInput={true}
                hideColumnSelector={false}
                onRowClick={(uuid: string) => { }}
                onRowDoubleClick={(uuid: string) => { }}
                onContextMenu={handleContextMenu(dispatch)}
                contextMenuColumn={true}
                dataTableDefaultView={
                    <DataTableDefaultView />
                } />
        </div>);
