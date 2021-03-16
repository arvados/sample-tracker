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

import { PATIENT_LIST_PANEL_ID, STUDY_PANEL_CURRENT_UUID, patientListPanelActions } from './patientList';

export const openStudyPanel = (projectUuid: string) =>
    (dispatch: Dispatch) => {
        dispatch(propertiesActions.SET_PROPERTY({ key: STUDY_PANEL_CURRENT_UUID, value: projectUuid }));
        dispatch(patientListPanelActions.REQUEST_ITEMS());
    };

interface StudyProps {
    studyUuid: string;
}

export const studyMapStateToProps = (state: RootState) => ({
    studyUuid: getProperty(STUDY_PANEL_CURRENT_UUID)(state.properties),
});

export const StudyMainPanel = connect(studyMapStateToProps)(
    ({ studyUuid }: StudyProps) =>
        <div>
            <DataExplorer
                id={PATIENT_LIST_PANEL_ID}
                onRowClick={(uuid: string) => { }}
                onRowDoubleClick={(uuid: string) => { }}
                onContextMenu={(event: React.MouseEvent<HTMLElement>, resourceUuid: string) => { }}
                contextMenuColumn={true}
                dataTableDefaultView={
                    <DataTableDefaultView />
                } />
        </div>);
