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
import { GroupClass, GroupResource } from "~/models/group";
import { withDialog } from "~/store/dialog/with-dialog";
import { sampleTrackerExtractionType, EXTRACTION_CREATE_FORM_NAME, AnalysisState } from "./sampleList";

enum ExtractionType {
    DNA = "DNA",
    RNA = "RNA",
}

export interface ExtractionCreateFormDialogData {
    sampleUuid: string;
    extractionType: ExtractionType;
    additionalId: number;
    sentForSequencing: string;
    sequencingCompleted: string;
    state: AnalysisState;
    batchUuid: string;
    uuidSelf: string;
}

type DialogExtractionProps = WithDialogProps<{ updating: boolean }> & InjectedFormProps<ExtractionCreateFormDialogData>;

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

const mustBeDefined = (value: any) => value === undefined ? "Must be defined" : undefined;

const ExtractionAddFields = () => <span>

    <InputLabel>Extraction type</InputLabel>
    <div>
        <Field
            name='extractionType'
            component={ExtractionTypeSelect}
            validate={mustBeDefined}
        />
    </div>

    <InputLabel>Additional id</InputLabel>
    <Field
        name='additionalId'
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


const DialogExtractionCreate = (props: DialogExtractionProps) =>
    <FormDialog
        dialogTitle={props.data.updating ? 'Edit sample' : 'Add sample'}
        formFields={ExtractionAddFields}
        submitLabel={props.data.updating ? 'Update sample' : 'Add sample'}
        {...props}
    />;

const makeExtractionId = (data: ExtractionCreateFormDialogData, state: RootState): string => {
    const rscSamp = getResource<LinkResource>(data.sampleUuid)(state.resources);
    const rscPat = getResource<GroupResource>(rscSamp!.ownerUuid)(state.resources);
    let id = rscPat!.name + "_" + data.extractionType + "_";

    if (rscSamp!.properties["sample_tracker:sample_type"] === "tumor") {
        id = id + "T";
    } else {
        id = id + "N";
    }

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
        const rscSamp = getResource<LinkResource>(data.sampleUuid)(getState().resources);
        dispatch(startSubmit(EXTRACTION_CREATE_FORM_NAME));
        const p = {
            name: makeExtractionId(data, getState()),
            ownerUuid: rscSamp!.ownerUuid,
            groupClass: GroupClass.PROJECT,
            properties: {
                "type": sampleTrackerExtractionType,
                "sample_tracker:extraction_type": data.extractionType,
                "sample_tracker:additional_id": data.additionalId,
                "sample_tracker:state": data.state,
                "sample_tracker:sample_uuid": data.sampleUuid,
                "sample_tracker:batch_uuid": "",
            }
        };
        if (data.uuidSelf) {
            await services.projectService.update(data.uuidSelf, p);
        } else {
            await services.projectService.create(p);
        }
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
