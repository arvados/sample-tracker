// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { dialogActions } from "~/store/dialog/dialog-actions";
import { WithDialogProps } from '~/store/dialog/with-dialog';
import { FormDialog } from '~/components/form-dialog/form-dialog';
import { ServiceRepository } from "~/services/services";
import { compose, Dispatch } from "redux";
import { reduxForm, WrappedFieldProps, initialize, InjectedFormProps, Field, startSubmit, reset } from 'redux-form';
import { RootState } from '~/store/store';
import { TextField } from "~/components/text-field/text-field";
import { getResource } from "~/store/resources/resources";
import { FormControl, InputLabel } from '@material-ui/core';
import {
    patientBaseRoutePath, patientRoutePath
} from './patientList';
import {
    sampleBaseRoutePath
} from './sampleList';
import { matchPath } from "react-router";
import { MenuItem, Select } from '@material-ui/core';
import { ArvadosTheme } from '~/common/custom-theme';
import { DispatchProp, connect } from 'react-redux';
import { withStyles, WithStyles } from '@material-ui/core/styles';
import { LinkResource } from "~/models/link";
import { GroupResource } from "~/models/group";
import { withDialog } from "~/store/dialog/with-dialog";

const EXTRACTION_CREATE_FORM_NAME = "extractionCreateFormName";

enum ExtractionType {
    DNA = "DNA",
    RNA = "RNA",
}

enum AnalysisState {
    NEW = "NEW",
    AT_SEQUENCING = "AT_SEQUENCING",
    SEQUENCED = "SEQUENCED",
    ANALYSIS_COMPLETE = "ANALYSIS_COMPLETE"
}

export interface ExtractionCreateFormDialogData {
    sampleUuid: string;
    extractionType: ExtractionType;
    additionalId: number;
    sentForSequencing: string;
    sequencingCompleted: string;
    state: AnalysisState;
    batchUuid: string;
}

type DialogExtractionProps = WithDialogProps<{}> & InjectedFormProps<ExtractionCreateFormDialogData>;

type CssRules = 'selectWidth';

const styles = withStyles<CssRules>((theme: ArvadosTheme) => ({
    selectWidth: {
        width: theme.spacing.unit * 20,
    }
}));

export const SampleStateSelect = styles(
    ({ classes, input }: WrappedFieldProps & WithStyles<CssRules>) =>
        <FormControl className={classes.selectWidth}>
            <Select
                {...input}>
                <MenuItem value={AnalysisState.NEW}>
                    NEW
		</MenuItem>
                <MenuItem value={AnalysisState.AT_SEQUENCING}>
                    AT_SEQUENCING
		</MenuItem>
                <MenuItem value={AnalysisState.SEQUENCED}>
                    SEQUENCED
		</MenuItem>
                <MenuItem value={AnalysisState.ANALYSIS_COMPLETE}>
                    ANALYSIS_COMPLETE
		</MenuItem>
            </Select>
        </FormControl>);

export const ExtractionTypeSelect = styles(
    ({ classes, input }: WrappedFieldProps & WithStyles<CssRules>) =>
        <FormControl className={classes.selectWidth}>
            <Select
                {...input}>
                <MenuItem value={ExtractionType.DNA}>
                    DNA
		</MenuItem>
                <MenuItem value={ExtractionType.RNA}>
                    RNA
		</MenuItem>
            </Select>
        </FormControl>);

const ExtractionAddFields = () => <span>

    <InputLabel>Extraction type</InputLabel>
    <div>
        <Field
            name='extractionType'
            component={ExtractionTypeSelect} />
    </div>

    <InputLabel>Additional id</InputLabel>
    <Field
        name='timePoint'
        component={TextField}
        type="number" />

    <InputLabel>Sent for sequencing</InputLabel>
    <Field
        name='sentForSequencing'
        component={TextField}
        type="date"
    />

    <InputLabel>Sequencing completed</InputLabel>
    <Field
        name='sequencingCompleted'
        component={TextField}
        type="date"
    />

    <InputLabel>State</InputLabel>
    <div><Field
        name='state'
        component={SampleStateSelect}
    /></div>

</span>;


const DialogExtractionCreate = (props: DialogExtractionProps) =>
    <FormDialog
        dialogTitle='Add extraction'
        formFields={ExtractionAddFields}
        submitLabel='Add a extraction'
        {...props}
    />;

const makeExtractionId = (data: ExtractionCreateFormDialogData, state: RootState): string => {
    const rscSamp = getResource<LinkResource>(sampleBaseRoutePath + "/" + data.sampleUuid)(state.resources);
    const rscPat = getResource<GroupResource>(patientBaseRoutePath + "/" + rscSamp!.ownerUuid)(state.resources);
    let id = rscPat!.name + "_" + data.extractionType + "_";

    if (rscSamp!.properties["sample_tracker:time_point"] < 10) {
        id = id + "_0" + rscSamp!.properties["sample_tracker:time_point"];
    } else {
        id = id + "_" + rscSamp!.properties["sample_tracker:time_point"];
    }
    if (data.additionalId < 10) {
        id = id + "_0" + data.additionalId;
    } else {
        id = id + "_" + data.additionalId;
    }

    return id;
};

const createExtraction = (data: ExtractionCreateFormDialogData) =>
    async (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {

        dispatch(startSubmit(EXTRACTION_CREATE_FORM_NAME));
        // const extractionId =
        makeExtractionId(data, getState());
        /*await services.linkService.create({
            ownerUuid: data.patientUuid,
            name: extractionId,
            linkClass: extractionTrackerExtractionType,
            properties: {
                "sample_tracker:collection_type": data.collectionType,
                "sample_tracker:extraction_type": data.extractionType,
                "sample_tracker:collected_at": data.collectedAt,
                "sample_tracker:time_point": data.timePoint,
                "sample_tracker:flow_started_at": data.flowStartedAt,
                "sample_tracker:flow_completed_at": data.flowCompletedAt,
            },
        });*/
        dispatch(dialogActions.CLOSE_DIALOG({ id: EXTRACTION_CREATE_FORM_NAME }));
        dispatch(reset(EXTRACTION_CREATE_FORM_NAME));
    };


export const CreateExtractionDialog = compose(
    withDialog(EXTRACTION_CREATE_FORM_NAME),
    reduxForm<ExtractionCreateFormDialogData>({
        form: EXTRACTION_CREATE_FORM_NAME,
        onSubmit: (data, dispatch) => {
            dispatch(createExtraction(data));
        }
    })
)(DialogExtractionCreate);


export const openExtractionCreateDialog = (sampleUuid: string) =>
    (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        dispatch(initialize(EXTRACTION_CREATE_FORM_NAME, { sampleUuid }));
        dispatch(dialogActions.OPEN_DIALOG({ id: EXTRACTION_CREATE_FORM_NAME, data: {} }));
    };


export interface MenuItemProps {
    className?: string;
    patientUuid?: string;
}

export interface PatientPathId {
    uuid: string;
}

export const extractionsMapStateToProps = (state: RootState) => {
    const props: MenuItemProps = {};
    const patientid = matchPath<PatientPathId>(state.router.location!.pathname, { path: patientRoutePath, exact: true });
    if (patientid) {
        props.patientUuid = patientid.params.uuid;
    }
    return props;
};

export const AddExtractionMenuComponent = connect<{}, {}, MenuItemProps>(extractionsMapStateToProps)(
    ({ patientUuid, dispatch, className }: MenuItemProps & DispatchProp<any>) =>
        <MenuItem className={className} onClick={() => dispatch(openExtractionCreateDialog(patientUuid!))} disabled={!patientUuid}>Add Extraction</MenuItem >
);
