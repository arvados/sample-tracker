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
import { InjectedFormProps, Field, WrappedFieldProps, reduxForm, startSubmit, reset } from 'redux-form';
import { WithDialogProps } from 'store/dialog/with-dialog';
import { FormDialog } from 'components/form-dialog/form-dialog';
import { ProjectNameField } from 'views-components/form-fields/project-form-fields';
import { dialogActions } from "store/dialog/dialog-actions";
import { MenuItem } from "@material-ui/core";
import { withDialog } from "store/dialog/with-dialog";
import { ServiceRepository } from "services/services";
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Checkbox from '@material-ui/core/Checkbox';
import { FormControl, InputLabel } from '@material-ui/core';
import { GroupClass, GroupResource } from "models/group";
import { withStyles, WithStyles } from '@material-ui/core/styles';
import { ArvadosTheme } from 'common/custom-theme';

import {
    batchListPanelActions,
    BATCH_LIST_PANEL_ID, BATCH_CREATE_FORM_NAME,
    openBatchCreateDialog, BatchCreateFormDialogData
} from './batchList';
import {
    sampleTrackerBatch, sampleTrackerBatchId, sampleTrackerSample, sampleTrackerState
} from './metadataTerms';

import { SampleStateSelect } from './sample';

export const BATCH_PANEL_CURRENT_UUID = "BatchPanelCurrentUUID";

type DialogProjectProps = WithDialogProps<BatchCreateFormDialogData> & InjectedFormProps<BatchCreateFormDialogData>;

export const FormCheckbox =
    ({ input }: WrappedFieldProps) =>
        <FormControl >
            <Checkbox {...input} />
        </FormControl>;

const mustBeDefined = (value: any) => value === undefined ? "Must be defined" : undefined;

type CssRules = 'listItemWidth' | 'listPadding';

const styles = withStyles<CssRules>((theme: ArvadosTheme) => ({
    listItemWidth: {
        width: "75%"
    },
    listPadding: {
        paddingTop: "0",
        paddingBottom: "0",
    }
}));

const BatchAddFields = styles(
    (props: DialogProjectProps & WithStyles<CssRules>) =>
        <span>
            <ProjectNameField label="External batch id" />
            <List>
                {props.data.selections.map((val, idx) =>
                    <ListItem className={props.classes.listPadding} key={val.sample.uuid}>
                        <Field name={"selections[" + idx + "].value"} component={FormCheckbox} type="checkbox" />
                        <span className={props.classes.listItemWidth}>{val.sample.name}</span>
                        <span>{val.sample.properties[sampleTrackerState]}</span>
                    </ListItem>)}
            </List>
        </span>);

const DialogBatchCreate = (props: DialogProjectProps) =>
    <FormDialog
        dialogTitle={props.data.selfUuid ? 'Edit batch' : 'New batch'}
        formFields={BatchAddFields}
        submitLabel={props.data.selfUuid ? 'Update batch' : 'Create a Batch'}
        {...props}
    />;

const createBatch = (data: BatchCreateFormDialogData) =>
    async (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        dispatch(startSubmit(BATCH_CREATE_FORM_NAME));
        const p = {
            name: data.name,
            ownerUuid: data.ownerUuid,
            groupClass: GroupClass.FILTER,
            properties: {
                "type": sampleTrackerBatch,
                "filters": [["uuid", "is_a", "arvados#collection"],
                ["collections.properties.type", "=", sampleTrackerSample],
                ["collections.properties." + sampleTrackerBatchId, "=", data.name]]
            }
        };

        let newBatch: GroupResource;
        if (data.selfUuid) {
            newBatch = await services.groupsService.update(data.selfUuid, p);
        } else {
            newBatch = await services.groupsService.create(p);
        }

        for (const s of data.selections) {
            if (s.value && !s.startingValue) {
                s.sample.properties[sampleTrackerBatchId] = newBatch.name;
                await services.collectionService.update(s.sample.uuid, { properties: s.sample.properties });
            } else if (!s.value && s.startingValue) {
                delete s.sample.properties[sampleTrackerBatchId];
                await services.collectionService.update(s.sample.uuid, { properties: s.sample.properties });
            }
        }

        dispatch(dialogActions.CLOSE_DIALOG({ id: BATCH_CREATE_FORM_NAME }));
        dispatch(reset(BATCH_CREATE_FORM_NAME));
        dispatch(batchListPanelActions.REQUEST_ITEMS());
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
