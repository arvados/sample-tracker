// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from "redux";
import { propertiesActions } from "~/store/properties/properties-actions";
import { getProperty } from '~/store/properties/properties';
import { RootState } from '~/store/store';
import { DataExplorer } from "~/views-components/data-explorer/data-explorer";
import { DataTableDefaultView } from '~/components/data-table-default-view/data-table-default-view';

import { PATIENT_PANEL_CURRENT_UUID } from './patientList';
import { SAMPLE_LIST_PANEL_ID, sampleListPanelActions } from './sampleList';

export const openPatientPanel = (projectUuid: string) =>
    (dispatch: Dispatch) => {
        dispatch(propertiesActions.SET_PROPERTY({ key: PATIENT_PANEL_CURRENT_UUID, value: projectUuid }));
        dispatch(sampleListPanelActions.REQUEST_ITEMS());
    };

interface PatientProps {
    patientUuid: string;
}

export const patientMapStateToProps = (state: RootState) => ({
    patientUuid: getProperty(PATIENT_PANEL_CURRENT_UUID)(state.properties),
});

export const PatientMainPanel = connect(patientMapStateToProps)(
    ({ patientUuid }: PatientProps) =>
        <div>
            <DataExplorer
                id={SAMPLE_LIST_PANEL_ID}
                hideSearchInput={true}
                hideColumnSelector={true}
                onRowClick={(uuid: string) => { }}
                onRowDoubleClick={(uuid: string) => { }}
                onContextMenu={(event: React.MouseEvent<HTMLElement>, resourceUuid: string) => { }}
                contextMenuColumn={true}
                dataTableDefaultView={
                    <DataTableDefaultView />
                } />
        </div>);
