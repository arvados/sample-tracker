// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { WithDialogProps } from '~/store/dialog/with-dialog';
import { FormDialog } from '~/components/form-dialog/form-dialog';
import { dialogActions } from "~/store/dialog/dialog-actions";
import { ServiceRepository } from "~/services/services";
import { compose, Dispatch } from "redux";
import { reduxForm, WrappedFieldProps, InjectedFormProps, Field, reset, startSubmit } from 'redux-form';
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
import { biopsyListPanelActions, BIOPSY_CREATE_FORM_NAME, openBiopsyCreateDialog } from "./biopsyList";
import { DispatchProp, connect } from 'react-redux';
import { withStyles, WithStyles } from '@material-ui/core/styles';
import { GroupResource } from "~/models/group";

import {
    sampleTrackerBiopsy, sampleTrackerCollectionType, sampleTrackerBiopsyType,
    sampleTrackerCollectedAt, sampleTrackerTimePoint, sampleTrackerFlowStartedAt,
    sampleTrackerFlowCompletedAt
} from './metadataTerms';


export interface BiopsyCreateFormDialogData {
    patientUuid: string;
    collectionType: CollectionType;
    biopsyType: BiopsyType;
    collectedAt: string;
    timePoint: number;
    flowStartedAt: string;
    flowCompletedAt: string;
}

type DialogBiopsyProps = WithDialogProps<{ updating: boolean }> & InjectedFormProps<BiopsyCreateFormDialogData>;

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

enum BiopsyType {
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

export const BiopsyTypeSelect = styles(
    ({ classes, input }: WrappedFieldProps & WithStyles<CssRules>) =>
        <FormControl className={classes.selectWidth}>
            <Select
                {...input}>
                <MenuItem value={BiopsyType.TUMOR}>
                    Tumor
		</MenuItem>
                <MenuItem value={BiopsyType.NORMAL}>
                    Normal
		</MenuItem>
            </Select>
        </FormControl>);

const mustBeDefined = (value: any) => value === undefined ? "Must be defined" : undefined;

const BiopsyAddFields = () => <span>

    <InputLabel>Patient biopsy time point</InputLabel>
    <Field
        name='timePoint'
        component={TextField}
        type="number"
        validate={mustBeDefined}
    />

    <InputLabel>Collection date</InputLabel>
    <Field
        name='collectedAt'
        component={TextField}
        type="date"
        validate={mustBeDefined}
    />

    <InputLabel>Collection type</InputLabel>
    <div>
        <Field
            name='collectionType'
            component={CollectionTypeSelect}
            validate={mustBeDefined}
        />
    </div>

    <InputLabel>Biopsy type</InputLabel>
    <div>
        <Field
            name='biopsyType'
            component={BiopsyTypeSelect}
            validate={mustBeDefined}
        />
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

const DialogBiopsyCreate = (props: DialogBiopsyProps) =>
    <FormDialog
        dialogTitle={props.data.updating ? 'Edit biopsy info' : 'Add biopsy'}
        formFields={BiopsyAddFields}
        submitLabel={props.data.updating ? 'Update biopsy info' : 'Add biopsy'}
        {...props}
    />;

const makeBiopsyId = (data: BiopsyCreateFormDialogData, state: RootState): string => {
    const rsc = getResource<GroupResource>(patientBaseRoutePath + "/" + data.patientUuid)(state.resources);
    let id = rsc!.name;
    if (data.collectionType === CollectionType.PERIPHERAL_BLOOD) {
        id = id + "_PB";
    }
    if (data.collectionType === CollectionType.BONE_MARROW) {
        id = id + "_BM";
    }
    if (data.biopsyType === BiopsyType.TUMOR) {
        id = id + "T";
    }
    if (data.biopsyType === BiopsyType.NORMAL) {
        id = id + "N";
    }

    if (data.timePoint < 10) {
        id = id + "_0" + data.timePoint;
    } else {
        id = id + "_" + data.timePoint;
    }
    return id;
};

const createBiopsy = (data: BiopsyCreateFormDialogData) =>
    async (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {

        dispatch(startSubmit(BIOPSY_CREATE_FORM_NAME));
        const biopsyId = makeBiopsyId(data, getState());
        await services.linkService.create({
            ownerUuid: data.patientUuid,
            name: biopsyId,
            linkClass: sampleTrackerBiopsy,
            properties: {
                [sampleTrackerCollectionType]: data.collectionType,
                [sampleTrackerBiopsyType]: data.biopsyType,
                [sampleTrackerCollectedAt]: data.collectedAt,
                [sampleTrackerTimePoint]: data.timePoint,
                [sampleTrackerFlowStartedAt]: data.flowStartedAt,
                [sampleTrackerFlowCompletedAt]: data.flowCompletedAt,
            },
        });
        dispatch(dialogActions.CLOSE_DIALOG({ id: BIOPSY_CREATE_FORM_NAME }));
        dispatch(reset(BIOPSY_CREATE_FORM_NAME));
        dispatch(biopsyListPanelActions.REQUEST_ITEMS());
    };

export const CreateBiopsyDialog = compose(
    withDialog(BIOPSY_CREATE_FORM_NAME),
    reduxForm<BiopsyCreateFormDialogData>({
        form: BIOPSY_CREATE_FORM_NAME,
        onSubmit: (data, dispatch) => {
            dispatch(createBiopsy(data));
        }
    })
)(DialogBiopsyCreate);



export interface MenuItemProps {
    className?: string;
    patientUuid?: string;
}

export interface PatientPathId {
    uuid: string;
}

export const biopsysMapStateToProps = (state: RootState) => {
    const props: MenuItemProps = {};
    const patientid = matchPath<PatientPathId>(state.router.location!.pathname, { path: patientRoutePath, exact: true });
    if (patientid) {
        props.patientUuid = patientid.params.uuid;
    }
    return props;
};

export const AddBiopsyMenuComponent = connect<{}, {}, MenuItemProps>(biopsysMapStateToProps)(
    ({ patientUuid, dispatch, className }: MenuItemProps & DispatchProp<any>) =>
        <MenuItem className={className} onClick={() => dispatch(openBiopsyCreateDialog(patientUuid!))} disabled={!patientUuid}>Add Biopsy</MenuItem >
);
