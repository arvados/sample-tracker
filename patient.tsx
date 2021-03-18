// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { DispatchProp, connect } from 'react-redux';
import { Dispatch } from "redux";
import { propertiesActions } from "~/store/properties/properties-actions";
import { getProperty } from '~/store/properties/properties';
import { RootState } from '~/store/store';
import { DataExplorer } from "~/views-components/data-explorer/data-explorer";
import { DataTableDefaultView } from '~/components/data-table-default-view/data-table-default-view';
import { openContextMenu } from '~/store/context-menu/context-menu-actions';
import { ResourceKind } from '~/models/resource';
import { ContextMenuActionSet } from "~/views-components/context-menu/context-menu-action-set";
import { openExtractionCreateDialog } from "./extraction";

import { PATIENT_PANEL_CURRENT_UUID } from './patientList';
import { SAMPLE_LIST_PANEL_ID, sampleListPanelActions, sampleBaseRoutePath } from './sampleList';

export const PATIENT_SAMPLE_MENU = "Sample Tracker - Patient Sample menu";

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

const handleContextMenu = (dispatch: Dispatch) =>
    (event: React.MouseEvent<HTMLElement>, resourceUuid: string) => {
        // const { resources } = this.props;
        // const resource = getResource<GroupContentsResource>(resourceUuid)(resources);
        // const menuKind = this.props.dispatch<any>(resourceUuidToContextMenuKind(resourceUuid));
        dispatch<any>(openContextMenu(event, {
            name: "",
            uuid: resourceUuid,
            ownerUuid: "",
            isTrashed: false,
            kind: ResourceKind.NONE,
            menuKind: PATIENT_SAMPLE_MENU
        }));
    };


export const patientSampleActionSet: ContextMenuActionSet = [[
    {
        name: "Add extraction",
        execute: (dispatch, resource) => {
            dispatch<any>(openExtractionCreateDialog(resource.uuid.substr(sampleBaseRoutePath.length + 1)));
        }
    },
]];

export const PatientMainPanel = connect(patientMapStateToProps)(
    ({ dispatch, patientUuid }: PatientProps & DispatchProp<any>) =>
        <div>
            <DataExplorer
                id={SAMPLE_LIST_PANEL_ID}
                hideSearchInput={true}
                hideColumnSelector={true}
                onRowClick={(uuid: string) => { }}
                onRowDoubleClick={(uuid: string) => { }}
                onContextMenu={handleContextMenu(dispatch)}
                contextMenuColumn={true}
                dataTableDefaultView={
                    <DataTableDefaultView />
                } />
        </div>);
