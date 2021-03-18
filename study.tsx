// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { connect, DispatchProp } from 'react-redux';
import { compose, Dispatch } from "redux";
import { propertiesActions } from "~/store/properties/properties-actions";
import { getProperty } from '~/store/properties/properties';
import { RootState } from '~/store/store';
import { DataExplorer } from "~/views-components/data-explorer/data-explorer";
import { DataTableDefaultView } from '~/components/data-table-default-view/data-table-default-view';
import { InjectedFormProps } from 'redux-form';
import { WithDialogProps } from '~/store/dialog/with-dialog';
import { ProjectCreateFormDialogData } from '~/store/projects/project-create-actions';
import { FormDialog } from '~/components/form-dialog/form-dialog';
import { ProjectNameField, ProjectDescriptionField } from '~/views-components/form-fields/project-form-fields';
import { dialogActions } from "~/store/dialog/dialog-actions";
import { MenuItem, Tabs, Tab } from "@material-ui/core";
import { createProject } from "~/store/workbench/workbench-actions";
import { reduxForm, initialize } from 'redux-form';
import { withDialog } from "~/store/dialog/with-dialog";
import { ServiceRepository } from "~/services/services";

import { sampleTrackerStudyType } from './studyList';

import {
    PATIENT_LIST_PANEL_ID, STUDY_PANEL_CURRENT_UUID,
    patientListPanelActions, patientListPanelColumns
} from './patientList';

import {
    BATCH_LIST_PANEL_ID, batchListPanelActions, batchListPanelColumns
} from './batchList';

const STUDY_CREATE_FORM_NAME = "studyCreateFormName";
const STUDY_PANEL_CURRENT_TAB = "studyPanelCurrentTab";

export interface ProjectCreateFormDialogData {
    ownerUuid: string;
    name: string;
    description: string;
}

type DialogProjectProps = WithDialogProps<{}> & InjectedFormProps<ProjectCreateFormDialogData>;

const StudyAddFields = () => <span>
    <ProjectNameField label="Study name" />
    <ProjectDescriptionField />
</span>;

const DialogStudyCreate = (props: DialogProjectProps) =>
    <FormDialog
        dialogTitle='New study'
        formFields={StudyAddFields}
        submitLabel='Create a Study'
        {...props}
    />;

export const CreateStudyDialog = compose(
    withDialog(STUDY_CREATE_FORM_NAME),
    reduxForm<ProjectCreateFormDialogData>({
        form: STUDY_CREATE_FORM_NAME,
        onSubmit: (data, dispatch) => {
            data.properties = { type: sampleTrackerStudyType };
            dispatch(createProject(data));
        }
    })
)(DialogStudyCreate);

const openStudyCreateDialog = () =>
    (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        dispatch(initialize(STUDY_CREATE_FORM_NAME, {}));
        dispatch(dialogActions.OPEN_DIALOG({ id: STUDY_CREATE_FORM_NAME, data: {} }));
    };

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
        dispatch(batchListPanelActions.SET_COLUMNS({ columns: batchListPanelColumns }));
        dispatch(propertiesActions.SET_PROPERTY({ key: STUDY_PANEL_CURRENT_UUID, value: projectUuid }));
        dispatch(patientListPanelActions.REQUEST_ITEMS());
        dispatch(batchListPanelActions.REQUEST_ITEMS());
    };

interface StudyProps {
    studyUuid: string;
    currentTab: number;
    changeTab: (event: any, value: number) => void;
}

export const studyMapStateToProps = (state: RootState) => ({
    studyUuid: getProperty(STUDY_PANEL_CURRENT_UUID)(state.properties),
    currentTab: getProperty(STUDY_PANEL_CURRENT_TAB)(state.properties) || 0,
});

export const studyDispatchToProps = (dispatch: Dispatch) => ({
    changeTab: (event: any, value: number) => {
        dispatch(propertiesActions.SET_PROPERTY({ key: STUDY_PANEL_CURRENT_TAB, value }));
    }
});

// onChange={}
export const StudyMainPanel = connect(studyMapStateToProps, studyDispatchToProps)(
    ({ studyUuid, currentTab, changeTab }: StudyProps) =>
        <div>
            <Tabs
                onChange={changeTab}
                value={currentTab}>
                <Tab key={`tab-label-patients`} disableRipple label="Patients" />
                <Tab key={`tab-label-batches`} disableRipple label="Batches" />
            </Tabs>

            {currentTab === 0 &&
                <DataExplorer
                    id={PATIENT_LIST_PANEL_ID}
                    onRowClick={(uuid: string) => { }}
                    onRowDoubleClick={(uuid: string) => { }}
                    onContextMenu={(event: React.MouseEvent<HTMLElement>, resourceUuid: string) => { }}
                    contextMenuColumn={true}
                    dataTableDefaultView={
                        <DataTableDefaultView />
                    } />}
            {currentTab === 1 &&
                <DataExplorer
                    id={BATCH_LIST_PANEL_ID}
                    onRowClick={(uuid: string) => { }}
                    onRowDoubleClick={(uuid: string) => { }}
                    onContextMenu={(event: React.MouseEvent<HTMLElement>, resourceUuid: string) => { }}
                    contextMenuColumn={true}
                    dataTableDefaultView={
                        <DataTableDefaultView />
                    } />}
        </div>);
