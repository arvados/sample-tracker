// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { WithDialogProps } from '~/store/dialog/with-dialog';
import { FormDialog } from '~/components/form-dialog/form-dialog';
import { dialogActions } from "~/store/dialog/dialog-actions";
import { ServiceRepository } from "~/services/services";
import { compose, Dispatch } from "redux";
import { reduxForm, WrappedFieldProps, InjectedFormProps, Field, reset, startSubmit, initialize } from 'redux-form';
import { withDialog } from "~/store/dialog/with-dialog";
import { RootState } from '~/store/store';
import { TextField } from "~/components/text-field/text-field";
import { FormControl, InputLabel } from '@material-ui/core';
import {
    patientRoutePath, patientBaseRoutePath
} from './patientList';
import { matchPath } from "react-router";
import { MenuItem, Select } from '@material-ui/core';
import { ArvadosTheme } from '~/common/custom-theme';
import { getResource } from "~/store/resources/resources";
import { sampleTrackerSampleType } from "./sampleList";
import { DispatchProp, connect } from 'react-redux';
import { withStyles, WithStyles } from '@material-ui/core/styles';
import { GroupResource } from "~/models/group";

const SAMPLE_CREATE_FORM_NAME = "sampleCreateFormName";

export interface SampleCreateFormDialogData {
    patientUuid: string;
    collectionType: CollectionType;
    sampleType: SampleType;
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
    PERIPHERAL_BLOOD = "peripheral_blood",
    BONE_MARROW = "bone_marrow"
}

enum SampleType {
    TUMOR = "tumor",
    NORMAL = "normal"
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

const openSampleCreateDialog = (patientUuid: string) =>
    (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        dispatch(initialize(SAMPLE_CREATE_FORM_NAME, { patientUuid }));
        dispatch(dialogActions.OPEN_DIALOG({ id: SAMPLE_CREATE_FORM_NAME, data: {} }));
    };


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

export const AddSampleMenuComponent = connect<{}, {}, MenuItemProps>(samplesMapStateToProps)(
    ({ patientUuid, dispatch, className }: MenuItemProps & DispatchProp<any>) =>
        <MenuItem className={className} onClick={() => dispatch(openSampleCreateDialog(patientUuid!))} disabled={!patientUuid}>Add Sample</MenuItem >
);
