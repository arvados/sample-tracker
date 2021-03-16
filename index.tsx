// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

// Plugin UI for laboratory sample tracking

import { PluginConfig } from '~/common/plugintypes';
import * as React from 'react';
import { Dispatch } from 'redux';
import { RootState } from '~/store/store';
import { push } from "react-router-redux";
import { Route, matchPath } from "react-router";
import { RootStore } from '~/store/store';
import { activateSidePanelTreeItem } from '~/store/side-panel-tree/side-panel-tree-actions';
import { setBreadcrumbs, setSidePanelBreadcrumbs } from '~/store/breadcrumbs/breadcrumbs-actions';
import { Location } from 'history';
import { handleFirstTimeLoad } from '~/store/workbench/workbench-actions';
import { dataExplorerMiddleware } from "~/store/data-explorer/data-explorer-middleware";
import { getResource } from "~/store/resources/resources";
import { GroupResource } from "~/models/group";
import { addMenuActionSet } from '~/views-components/context-menu/context-menu';

import {
    AddStudyMenuComponent, StudyListMainPanel, CreateStudyDialog,
    studyListPanelColumns, studyListPanelActions, openStudyListPanel,
    StudyListPanelMiddlewareService, STUDY_LIST_PANEL_ID,
    studyListRoutePath, studyRoutePath
} from './studyList';
import {
    AddPatientMenuComponent, CreatePatientDialog, PATIENT_LIST_PANEL_ID, StudyPathId,
    PatientListPanelMiddlewareService,
    patientListPanelColumns, patientListPanelActions, patientRoutePath, patientBaseRoutePath
} from './patientList';
import {
    SampleListPanelMiddlewareService,
    SAMPLE_LIST_PANEL_ID, sampleListPanelColumns, sampleListPanelActions
} from './sampleList';
import {
    AddSampleMenuComponent, CreateSampleDialog
} from './sample';
import {
    openStudyPanel, StudyMainPanel
} from './study';
import {
    openPatientPanel, PatientMainPanel, PATIENT_SAMPLE_MENU, patientSampleActionSet
} from './patient';
import { CreateExtractionDialog } from './extraction';

const categoryName = "Studies";

export const register = (pluginConfig: PluginConfig) => {

    pluginConfig.centerPanelList.push((elms) => {
        elms.push(<Route path={studyListRoutePath} component={StudyListMainPanel} exact={true} />);
        elms.push(<Route path={studyRoutePath} component={StudyMainPanel} exact={true} />);
        elms.push(<Route path={patientRoutePath} component={PatientMainPanel} exact={true} />);
        return elms;
    });

    pluginConfig.newButtonMenuList.push((elms, menuItemClass) => {
        elms.push(<AddStudyMenuComponent className={menuItemClass} />);
        elms.push(<AddPatientMenuComponent className={menuItemClass} />);
        elms.push(<AddSampleMenuComponent className={menuItemClass} />);
        return elms;
    });

    pluginConfig.navigateToHandlers.push((dispatch: Dispatch, getState: () => RootState, uuid: string) => {
        if (uuid === categoryName) {
            dispatch(push(studyListRoutePath));
            return true;
        }
        if (uuid.startsWith(studyListRoutePath)) {
            dispatch(push(uuid));
            return true;
        }
        if (uuid.startsWith(patientBaseRoutePath)) {
            dispatch(push(uuid));
            return true;
        }
        return false;
    });

    pluginConfig.sidePanelCategories.push((cats: string[]): string[] => { cats.push(categoryName); return cats; });

    pluginConfig.locationChangeHandlers.push((store: RootStore, pathname: string): boolean => {
        if (matchPath(pathname, { path: studyListRoutePath, exact: true })) {
            store.dispatch(handleFirstTimeLoad(
                (dispatch: Dispatch) => {
                    dispatch(studyListPanelActions.SET_COLUMNS({ columns: studyListPanelColumns }));
                    dispatch<any>(openStudyListPanel);
                    dispatch<any>(activateSidePanelTreeItem(categoryName));
                    dispatch<any>(setSidePanelBreadcrumbs(categoryName));
                }));
            return true;
        }
        const studyid = matchPath<StudyPathId>(pathname, { path: studyRoutePath, exact: true });
        if (studyid) {
            store.dispatch(handleFirstTimeLoad(
                (dispatch: Dispatch) => {
                    dispatch(patientListPanelActions.SET_COLUMNS({ columns: patientListPanelColumns }));
                    dispatch<any>(openStudyPanel(studyid.params.uuid));
                    // dispatch<any>(activateSidePanelTreeItem(categoryName));
                    // const name = getProperty(PATIENT_PANEL_CURRENT_UUID)(state.properties),
                    const rsc = getResource<GroupResource>(pathname)(store.getState().resources);
                    if (rsc) {
                        dispatch<any>(setBreadcrumbs([{ label: categoryName, uuid: categoryName }, { label: rsc.name, uuid: pathname }]));
                    }
                }));
            return true;
        }
        const patientid = matchPath<StudyPathId>(pathname, { path: patientRoutePath, exact: true });
        if (patientid) {
            store.dispatch(handleFirstTimeLoad(
                (dispatch: Dispatch) => {
                    dispatch(sampleListPanelActions.SET_COLUMNS({ columns: sampleListPanelColumns }));
                    dispatch<any>(openPatientPanel(patientid.params.uuid));
                    // dispatch<any>(activateSidePanelTreeItem(categoryName));
                    const patientrsc = getResource<GroupResource>(pathname)(store.getState().resources);
                    if (patientrsc) {
                        const studyid = studyListRoutePath + "/" + patientrsc.ownerUuid;
                        const studyrsc = getResource<GroupResource>(studyid)(store.getState().resources);
                        if (studyrsc) {
                            dispatch<any>(setBreadcrumbs([{ label: categoryName, uuid: categoryName },
                            { label: studyrsc.name, uuid: studyid },
                            { label: patientrsc.name, uuid: pathname }]));
                        }
                    }
                }));
            return true;
        }

        return false;
    });

    pluginConfig.enableNewButtonMatchers.push((location: Location) => (!!matchPath(location.pathname, { path: studyListRoutePath, exact: false })));
    pluginConfig.enableNewButtonMatchers.push((location: Location) => (!!matchPath(location.pathname, { path: patientBaseRoutePath, exact: false })));

    pluginConfig.dialogs.push(<CreateStudyDialog />);
    pluginConfig.dialogs.push(<CreatePatientDialog />);
    pluginConfig.dialogs.push(<CreateSampleDialog />);
    pluginConfig.dialogs.push(<CreateExtractionDialog />);

    pluginConfig.middlewares.push((elms, services) => {
        elms.push(dataExplorerMiddleware(
            new StudyListPanelMiddlewareService(services, STUDY_LIST_PANEL_ID)
        ));
        elms.push(dataExplorerMiddleware(
            new PatientListPanelMiddlewareService(services, PATIENT_LIST_PANEL_ID)
        ));
        elms.push(dataExplorerMiddleware(
            new SampleListPanelMiddlewareService(services, SAMPLE_LIST_PANEL_ID)
        ));

        return elms;
    });

    addMenuActionSet(PATIENT_SAMPLE_MENU, patientSampleActionSet);
};
