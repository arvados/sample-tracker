// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { connect, DispatchProp } from 'react-redux';
import { compose, Dispatch } from "redux";
import { propertiesActions } from "store/properties/properties-actions";
import { getProperty } from 'store/properties/properties';
import { RootState } from 'store/store';
import { DataExplorer } from "views-components/data-explorer/data-explorer";
import { DataTableDefaultView } from 'components/data-table-default-view/data-table-default-view';
import { reduxForm, initialize, Field, InjectedFormProps, reset, startSubmit } from 'redux-form';
import { TextField } from "components/text-field/text-field";
import { WithDialogProps } from 'store/dialog/with-dialog';
import { FormDialog } from 'components/form-dialog/form-dialog';
import { ProjectNameField, ProjectDescriptionField } from 'views-components/form-fields/project-form-fields';
import { dialogActions } from "store/dialog/dialog-actions";
import { MenuItem, Tabs, Tab, InputLabel } from "@material-ui/core";
import { withDialog } from "store/dialog/with-dialog";
import { ServiceRepository } from "services/services";
import { sampleTrackerStudy, sampleTrackerStudyPrefix } from "./metadataTerms";
import { PropertiedResource } from "./resource-component";
import { ContextMenuActionSet } from "views-components/context-menu/context-menu-action-set";
import { getResource } from 'store/resources/resources';
import { studyListRoutePath, studyListPanelActions } from "./studyList";
import { openContextMenu } from 'store/context-menu/context-menu-actions';
import { ResourceKind } from 'models/resource';
import * as projectCreateActions from 'store/projects/project-create-actions';
import {
    loadSidePanelTreeProjects,
} from 'store/side-panel-tree/side-panel-tree-actions';

import {
    PATIENT_LIST_PANEL_ID, STUDY_PANEL_CURRENT_UUID,
    patientListPanelActions, patientListPanelColumns
} from './patientList';

const STUDY_CREATE_FORM_NAME = "studyCreateFormName";
const STUDY_PANEL_CURRENT_TAB = "studyPanelCurrentTab";
export const PATIENT_CONTEXT_MENU = "patientContextMenu";

export interface StudyCreateFormDialogData {
    ownerUuid: string;
    name: string;
    description: string;
    studyPrefix: string;
    uuid: string;
}

type DialogProjectProps = WithDialogProps<{ updating: boolean }> & InjectedFormProps<StudyCreateFormDialogData>;

const mustBeDefined = (value: any) => value === undefined ? "Must be defined" : undefined;

const StudyAddFields = () => <span>
    <ProjectNameField label="Study name" />
    <InputLabel>Study patient id prefix</InputLabel>
    <Field
        name='studyPrefix'
        component={TextField as any}
        validate={mustBeDefined}
    />
    <ProjectDescriptionField />
</span>;

const DialogStudyCreate = (props: DialogProjectProps) =>
    <FormDialog
        dialogTitle={props.data.updating ? 'Edit Study info' : 'Create Study'}
        formFields={StudyAddFields}
        submitLabel={props.data.updating ? 'Update Study info' : 'Create Study'}
        {...props}
    />;

const createUpdateStudy = (data: StudyCreateFormDialogData) =>
    async (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        dispatch(startSubmit(STUDY_CREATE_FORM_NAME));
        try {
            const g = {
                name: data.name,
                ownerUuid: data.ownerUuid,
                description: data.description,
                properties: {
                    type: sampleTrackerStudy,
                    [sampleTrackerStudyPrefix]: data.studyPrefix
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
            dispatch(dialogActions.CLOSE_DIALOG({ id: STUDY_CREATE_FORM_NAME }));
            dispatch(reset(STUDY_CREATE_FORM_NAME));
            dispatch(studyListPanelActions.REQUEST_ITEMS());
        }
    };

export const CreateStudyDialog = compose(
    withDialog(STUDY_CREATE_FORM_NAME),
    reduxForm<StudyCreateFormDialogData>({
        form: STUDY_CREATE_FORM_NAME,
        onSubmit: (data, dispatch) => {
            dispatch(createUpdateStudy(data));
        }
    })
)(DialogStudyCreate);

const openStudyCreateDialog = (editExisting?: string) =>
    (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        if (editExisting) {
            const study = getResource<PropertiedResource>(editExisting)(getState().resources);
            if (study) {
                dispatch(initialize(STUDY_CREATE_FORM_NAME, {
                    uuid: editExisting.substr(studyListRoutePath.length + 1),
                    ownerUuid: study.ownerUuid,
                    name: study.name,
                    description: study.description,
                    studyPrefix: study.properties[sampleTrackerStudyPrefix]
                }));
            }
        }
        else {
            dispatch(initialize(STUDY_CREATE_FORM_NAME, {}));
        }
        dispatch(dialogActions.OPEN_DIALOG({ id: STUDY_CREATE_FORM_NAME, data: { updating: editExisting !== undefined } }));
    };

export const studyActionSet: ContextMenuActionSet = [[
    {
        name: "Edit",
        execute: (dispatch, resource) => {
            dispatch<any>(openStudyCreateDialog(resource.uuid));
        }
    },
]];

interface TrackerProps {
    className?: string;
}

export const AddStudyMenuComponent = connect()(
    ({ dispatch, className }: TrackerProps & DispatchProp<any>) =>
        <MenuItem className={className} onClick={() => dispatch(openStudyCreateDialog())}>Add Study</MenuItem >
);

export const openStudyPanel = (projectUuid: string) =>
    (dispatch: Dispatch) => {
        dispatch(patientListPanelActions.SET_COLUMNS({ columns: patientListPanelColumns }));
        dispatch(propertiesActions.SET_PROPERTY({ key: STUDY_PANEL_CURRENT_UUID, value: projectUuid }));
        dispatch(patientListPanelActions.REQUEST_ITEMS());
    };

interface StudyProps {
    studyUuid: string;
    currentTab: number;
    changeTab: (event: any, value: number) => void;
    openPatientContextMenu: () => (event: React.MouseEvent<HTMLElement>, resourceUuid: string) => void;
}

export const studyMapStateToProps = (state: RootState) => ({
    studyUuid: getProperty(STUDY_PANEL_CURRENT_UUID)(state.properties)
});

export const studyDispatchToProps = (dispatch: Dispatch) => ({
    openPatientContextMenu: handlePatientContextMenu(dispatch)
});


const handlePatientContextMenu = (dispatch: Dispatch) =>
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
            menuKind: PATIENT_CONTEXT_MENU
        }));
    };

export const StudyMainPanel = connect(studyMapStateToProps, studyDispatchToProps)(
    ({ openPatientContextMenu, studyUuid }: StudyProps & DispatchProp<any>) =>
        <DataExplorer
            id={PATIENT_LIST_PANEL_ID}
            onRowClick={(uuid: string) => { }}
            onRowDoubleClick={(uuid: string) => { }}
            onContextMenu={openPatientContextMenu}
            contextMenuColumn={true}
            dataTableDefaultView={
                <DataTableDefaultView />
            } />);
