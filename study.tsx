// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { connect } from 'react-redux';
import { studyListRoutePath } from './studyList';
import { Dispatch } from "redux";
import { propertiesActions } from "~/store/properties/properties-actions";
import { getProperty } from '~/store/properties/properties';
import { RootState } from '~/store/store';

export const studyRoutePath = studyListRoutePath + "/:uuid";
const STUDY_PANEL_CURRENT_UUID = "StudyPanelCurrentUUID";

export const openStudyPanel = (projectUuid: string) =>
    (dispatch: Dispatch) => {
        dispatch(propertiesActions.SET_PROPERTY({ key: STUDY_PANEL_CURRENT_UUID, value: projectUuid }));
        // dispatch(studyListPanelActions.REQUEST_ITEMS());
    };

interface StudyProps {
    studyUuid: string;
}

export const studyMapStateToProps = (state: RootState) => ({
    studyUuid: getProperty(STUDY_PANEL_CURRENT_UUID)(state.properties),
});

export const StudyMainPanel = connect(studyMapStateToProps)(
    ({ studyUuid }: StudyProps) =>
        <p>Main panel for study {studyUuid}</p>);
