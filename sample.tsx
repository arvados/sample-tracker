// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { dialogActions } from "~/store/dialog/dialog-actions";
import { WithDialogProps } from '~/store/dialog/with-dialog';
import { FormDialog } from '~/components/form-dialog/form-dialog';
import { ServiceRepository } from "~/services/services";
import { compose, Dispatch } from "redux";
import { reduxForm, WrappedFieldProps, InjectedFormProps, Field, startSubmit, reset } from 'redux-form';
import { RootState } from '~/store/store';
import { TextField } from "~/components/text-field/text-field";
import { getResource } from "~/store/resources/resources";
import { FormControl, InputLabel } from '@material-ui/core';
import { MenuItem, Select } from '@material-ui/core';
import { ArvadosTheme } from '~/common/custom-theme';
import { withStyles, WithStyles } from '@material-ui/core/styles';
import { LinkResource } from "~/models/link";
import { GroupClass } from "~/models/group";
import { withDialog } from "~/store/dialog/with-dialog";
import { SAMPLE_CREATE_FORM_NAME, AnalysisState, biopsyListPanelActions } from "./biopsyList";
import {
    sampleTrackerSample, sampleTrackerSampleType,
    sampleTrackerTimePoint, sampleTrackerAliquot,
    sampleTrackerState, sampleTrackerBiopsyUuid,
    sampleTrackerBatchUuid, sampleTrackerSentForSequencingAt,
    sampleTrackerSequencingCompletedAt
} from "./metadataTerms";

enum SampleType {
    DNA = "DNA",
    RNA = "RNA",
}

export interface SampleCreateFormDialogData {
    biopsyUuid: string;
    sampleType: SampleType;
    timePoint: number;
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
            component={SampleTypeSelect}
            validate={mustBeDefined}
        />
    </div>

    <InputLabel>Sample time point</InputLabel>
    <Field
        name='timePoint'
        component={TextField}
        type="number" />

    <InputLabel>Aliquot</InputLabel>
    <Field
        name='aliquot'
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
    const rscSamp = getResource<LinkResource>(data.biopsyUuid)(state.resources);
    let id = rscSamp!.name + "_" + data.sampleType;

    if (data.timePoint < 10) {
        id = id + "_0" + data.timePoint;
    } else {
        id = id + "_" + data.timePoint;
    }
    if (data.aliquot < 10) {
        id = id + "_0" + data.aliquot;
    } else {
        id = id + "_" + data.aliquot;
    }
    return id;
};

const createSample = (data: SampleCreateFormDialogData) =>
    async (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        const rscSamp = getResource<LinkResource>(data.biopsyUuid)(getState().resources);
        dispatch(startSubmit(SAMPLE_CREATE_FORM_NAME));
        const p = {
            name: makeSampleId(data, getState()),
            ownerUuid: rscSamp!.ownerUuid,
            groupClass: GroupClass.PROJECT,
            properties: {
                "type": sampleTrackerSample,
                [sampleTrackerSampleType]: data.sampleType,
                [sampleTrackerTimePoint]: data.timePoint,
                [sampleTrackerAliquot]: data.aliquot,
                [sampleTrackerSentForSequencingAt]: data.sentForSequencing,
                [sampleTrackerSequencingCompletedAt]: data.sequencingCompleted,
                [sampleTrackerState]: data.state,
                [sampleTrackerBiopsyUuid]: data.biopsyUuid,
                [sampleTrackerBatchUuid]: "",
            }
        };
        if (data.uuidSelf) {
            await services.projectService.update(data.uuidSelf, p);
        } else {
            await services.projectService.create(p);
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
