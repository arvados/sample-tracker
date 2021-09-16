// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { dialogActions } from "store/dialog/dialog-actions";
import { WithDialogProps } from 'store/dialog/with-dialog';
import { FormDialog } from 'components/form-dialog/form-dialog';
import { ServiceRepository } from "services/services";
import { compose, Dispatch } from "redux";
import { reduxForm, WrappedFieldProps, InjectedFormProps, Field, startSubmit, reset } from 'redux-form';
import { RootState } from 'store/store';
import { TextField } from "components/text-field/text-field";
import { getResource } from "store/resources/resources";
import { FormControl, InputLabel } from '@material-ui/core';
import { MenuItem, Select } from '@material-ui/core';
import { ArvadosTheme } from 'common/custom-theme';
import { withStyles, WithStyles } from '@material-ui/core/styles';
import { GroupResource } from "models/group";
import { GroupClass } from "models/group";
import { withDialog } from "store/dialog/with-dialog";
import { SAMPLE_CREATE_FORM_NAME, biopsyListPanelActions } from "./biopsyList";
import {
    sampleTrackerSample, sampleTrackerSampleType,
    sampleTrackerAliquot,
    sampleTrackerState, sampleTrackerBatchId, sampleTrackerSentForSequencingAt,
    sampleTrackerSequencingCompletedAt, AnalysisState, SampleType
} from "./metadataTerms";


export interface SampleCreateFormDialogData {
    biopsyUuid: string;
    sampleType: SampleType;
    aliquot: number;
    sentForSequencing: string;
    sequencingCompleted: string;
    state: AnalysisState;
    batchUuid: string;
    uuidSelf: string;
}

type DialogSampleProps = WithDialogProps<{ updating: boolean }> & InjectedFormProps<SampleCreateFormDialogData>;

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
                <MenuItem value={AnalysisState.SEQ_FAILED}>
                    SEQ_FAILED
                </MenuItem>
                <MenuItem value={AnalysisState.ANALYSIS_COMPLETE}>
                    ANALYSIS_COMPLETE
                </MenuItem>
            </Select>
        </FormControl>);

export const SampleTypeSelect = styles(
    ({ classes, input }: WrappedFieldProps & WithStyles<CssRules>) =>
        <FormControl className={classes.selectWidth}>
            <Select
                {...input}>
                <MenuItem value={SampleType.DNA}>
                    DNA
                </MenuItem>
                <MenuItem value={SampleType.RNA}>
                    RNA
                </MenuItem>
            </Select>
        </FormControl>);

const mustBeDefined = (value: any) => value === undefined ? "Must be defined" : undefined;

const SampleAddFields = () => <span>

    <InputLabel>Sample type</InputLabel>
    <div>
        <Field
            name='sampleType'
            component={SampleTypeSelect as any}
            validate={mustBeDefined}
        />
    </div>

    <InputLabel>Aliquot</InputLabel>
    <Field
        name='aliquot'
        component={TextField as any}
        type="number" />

    <InputLabel>Sent for sequencing</InputLabel>
    <Field
        name='sentForSequencing'
        component={TextField as any}
        type="date"
    />

    <InputLabel>Sequencing completed</InputLabel>
    <Field
        name='sequencingCompleted'
        component={TextField as any}
        type="date"
    />

    <InputLabel>State</InputLabel>
    <div><Field
        name='state'
        component={SampleStateSelect as any}
        validate={mustBeDefined}
    /></div>
</span>;


const DialogSampleCreate = (props: DialogSampleProps) =>
    <FormDialog
        dialogTitle={props.data.updating ? 'Edit sample info' : 'Add sample'}
        formFields={SampleAddFields}
        submitLabel={props.data.updating ? 'Update sample info' : 'Add sample'}
        {...props}
    />;

const makeSampleId = (data: SampleCreateFormDialogData, state: RootState): string => {
    const rscSamp = getResource<GroupResource>(data.biopsyUuid)(state.resources);
    let id = rscSamp!.name + "_" + data.sampleType;

    if (data.aliquot < 10) {
        id = id + "_0" + data.aliquot;
    } else {
        id = id + "_" + data.aliquot;
    }
    return id;
};

const createSample = (data: SampleCreateFormDialogData) =>
    async (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        const rscSamp = getResource<GroupResource>(data.biopsyUuid)(getState().resources);
        dispatch(startSubmit(SAMPLE_CREATE_FORM_NAME));

        if (data.sentForSequencing && data.state == AnalysisState.NEW) {
            data.state = AnalysisState.AT_SEQUENCING;
        }
        if (data.sequencingCompleted && (data.state == AnalysisState.NEW || data.state == AnalysisState.AT_SEQUENCING)) {
            data.state = AnalysisState.SEQUENCED;
        }

        const p = {
            name: makeSampleId(data, getState()),
            ownerUuid: rscSamp!.ownerUuid,
            properties: {
                "type": sampleTrackerSample,
                [sampleTrackerSampleType]: data.sampleType,
                [sampleTrackerAliquot]: data.aliquot,
                [sampleTrackerSentForSequencingAt]: data.sentForSequencing,
                [sampleTrackerSequencingCompletedAt]: data.sequencingCompleted,
                [sampleTrackerState]: data.state,
                [sampleTrackerBatchId]: "",
            }
        };
        if (data.uuidSelf) {
            await services.collectionService.update(data.uuidSelf, p);
        } else {
            await services.collectionService.create(p);
        }
        dispatch(dialogActions.CLOSE_DIALOG({ id: SAMPLE_CREATE_FORM_NAME }));
        dispatch(reset(SAMPLE_CREATE_FORM_NAME));
        dispatch(biopsyListPanelActions.REQUEST_ITEMS());
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
