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
import { InjectedFormProps, Field, WrappedFieldProps, reduxForm, initialize, startSubmit, reset } from 'redux-form';
import { WithDialogProps } from '~/store/dialog/with-dialog';
import { FormDialog } from '~/components/form-dialog/form-dialog';
import { ProjectNameField } from '~/views-components/form-fields/project-form-fields';
import { dialogActions } from "~/store/dialog/dialog-actions";
import { MenuItem } from "@material-ui/core";
import { withDialog } from "~/store/dialog/with-dialog";
import { ServiceRepository } from "~/services/services";
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Checkbox from '@material-ui/core/Checkbox';
import { FormControl, InputLabel } from '@material-ui/core';
import { FilterBuilder } from "~/services/api/filter-builder";
import { GroupClass, GroupResource } from "~/models/group";

import { sampleTrackerBatchType, batchListPanelActions, BATCH_LIST_PANEL_ID } from './batchList';
import { AnalysisState, SampleStateSelect } from './extraction';

const BATCH_CREATE_FORM_NAME = "batchCreateFormName";
export const BATCH_PANEL_CURRENT_UUID = "BatchPanelCurrentUUID";

export interface BatchCreateFormDialogData {
    ownerUuid: string;
    name: string;
    state: AnalysisState;
    selections: {
        extraction: GroupResource,
        value: boolean,
        startingValue: boolean,
    }[];
}

type DialogProjectProps = WithDialogProps<BatchCreateFormDialogData> & InjectedFormProps<BatchCreateFormDialogData>;

export const FormCheckbox =
    ({ input }: WrappedFieldProps) =>
        <FormControl >
            <Checkbox {...input} />
        </FormControl>;

const mustBeDefined = (value: any) => value === undefined ? "Must be defined" : undefined;

const BatchAddFields = (props: DialogProjectProps) => <span>
    <ProjectNameField label="External batch id" />
    <InputLabel>State</InputLabel>
    <div><Field
        name='state'
        component={SampleStateSelect}
        validate={mustBeDefined}
    /></div>
    <List>
        {props.data.selections.map((val, idx) =>
            <ListItem key={val.extraction.uuid}>
                <Field name={"selections[" + idx + "].value"} component={FormCheckbox} type="checkbox" />
                <span>{val.extraction.name}</span>
            </ListItem>)}
    </List>
</span>;

const DialogBatchCreate = (props: DialogProjectProps) =>
    <FormDialog
        dialogTitle='New batch'
        formFields={BatchAddFields}
        submitLabel='Create a Batch'
        {...props}
    />;

const createBatch = (data: BatchCreateFormDialogData) =>
    async (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        dispatch(startSubmit(BATCH_CREATE_FORM_NAME));
        const p = {
            name: data.name,
            groupClass: GroupClass.PROJECT,
            properties: {
                "type": sampleTrackerBatchType,
                "sample_tracker:state": data.state,
            }
        };
        const newBatch = await services.projectService.create(p);

        for (const s of data.selections) {
            if (s.value && !s.startingValue) {
                s.extraction.properties["sample_tracker:batch_uuid"] = newBatch.uuid;
                s.extraction.properties["sample_tracker:state"] = data.state;
                await services.groupsService.update(s.extraction.uuid, { properties: s.extraction.properties });
            } else if (!s.value && s.startingValue) {
                delete s.extraction.properties["sample_tracker:batch_uuid"];
                await services.groupsService.update(s.extraction.uuid, { properties: s.extraction.properties });
            }
        }

        dispatch(dialogActions.CLOSE_DIALOG({ id: BATCH_CREATE_FORM_NAME }));
        dispatch(reset(BATCH_CREATE_FORM_NAME));
    };

export const CreateBatchDialog = compose(
    withDialog(BATCH_CREATE_FORM_NAME),
    reduxForm<BatchCreateFormDialogData>({
        form: BATCH_CREATE_FORM_NAME,
        onSubmit: (data, dispatch) => {
            dispatch(createBatch(data));
        }
    })
)(DialogBatchCreate);

const openBatchCreateDialog = () =>
    async (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        const results = await services.groupsService.list({
            filters: new FilterBuilder()
                .addEqual("properties.type", "sample_tracker:extraction")
                .addEqual("properties.sample_tracker:state", "NEW")
                .getFilters()
        });
        const samples = await services.linkService.list({
            filters: new FilterBuilder()
                .addIn("uuid", results.items.map((item) => item.properties["sample_tracker:sample_uuid"]))
                .getFilters()
        });
        console.log(samples);
        const selections = results.items.map((item) => ({
            extraction: item,
            value: false,
            startingValue: false
        }));
        dispatch(initialize(BATCH_CREATE_FORM_NAME, { selections }));
        dispatch(dialogActions.OPEN_DIALOG({ id: BATCH_CREATE_FORM_NAME, data: { selections } }));
    };

interface TrackerProps {
    className?: string;
}

export const AddBatchMenuComponent = connect()(
    ({ dispatch, className }: TrackerProps & DispatchProp<any>) =>
        <MenuItem className={className} onClick={() => dispatch(openBatchCreateDialog())}>Add Batch</MenuItem >
);

export const openBatchPanel = (projectUuid: string) =>
    (dispatch: Dispatch) => {
        dispatch(propertiesActions.SET_PROPERTY({ key: BATCH_PANEL_CURRENT_UUID, value: projectUuid }));
        dispatch(batchListPanelActions.REQUEST_ITEMS());
    };

interface BatchProps {
    batchUuid: string;
}

export const batchMapStateToProps = (state: RootState) => ({
    batchUuid: getProperty(BATCH_PANEL_CURRENT_UUID)(state.properties),
});

export const BatchMainPanel = connect(batchMapStateToProps)(
    ({ batchUuid }: BatchProps) =>
        <div>
            <DataExplorer
                id={BATCH_LIST_PANEL_ID}
                onRowClick={(uuid: string) => { }}
                onRowDoubleClick={(uuid: string) => { }}
                onContextMenu={(event: React.MouseEvent<HTMLElement>, resourceUuid: string) => { }}
                contextMenuColumn={true}
                dataTableDefaultView={
                    <DataTableDefaultView />
                } />
        </div>);
