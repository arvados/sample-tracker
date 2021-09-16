// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

// Plugin UI for laboratory sample tracking

import { PluginConfig } from 'common/plugintypes';
import * as React from 'react';
import { Dispatch } from 'redux';
import { RootState } from 'store/store';
import { push } from "react-router-redux";
import { Route, matchPath } from "react-router";
import { RootStore } from 'store/store';
import { activateSidePanelTreeItem } from 'store/side-panel-tree/side-panel-tree-actions';
import { setBreadcrumbs, setSidePanelBreadcrumbs } from 'store/breadcrumbs/breadcrumbs-actions';
import { Location } from 'history';
import { handleFirstTimeLoad } from 'store/workbench/workbench-actions';
import { dataExplorerMiddleware } from "store/data-explorer/data-explorer-middleware";
import { getResource } from "store/resources/resources";
import { loadResource } from "store/resources/resources-actions";
import { GroupResource } from "models/group";
import { addMenuActionSet } from 'views-components/context-menu/context-menu';

import {
    StudyListMainPanel,
    openStudyListPanel,
    StudyListPanelMiddlewareService, STUDY_LIST_PANEL_ID,
    studyListRoutePath, studyRoutePath, STUDY_CONTEXT_MENU
} from './studyList';
import {
    openStudyPanel, StudyMainPanel, CreateStudyDialog, AddStudyMenuComponent, studyActionSet, PATIENT_CONTEXT_MENU
} from './study';

import {
    PATIENT_LIST_PANEL_ID,
    PatientListPanelMiddlewareService,
    patientRoutePath, patientBaseRoutePath
} from './patientList';
import {
    openPatientPanel, PatientMainPanel, PATIENT_BIOPSY_MENU, patientBiopsyActionSet,
    CreatePatientDialog, AddPatientMenuComponent, StudyPathId, patientListActionSet
} from './patient';

import {
    BiopsyListPanelMiddlewareService,
    BIOPSY_LIST_PANEL_ID,
} from './biopsyList';
import {
    AddBiopsyMenuComponent, CreateBiopsyDialog
} from './biopsy';

import {
    AddBatchMenuComponent, CreateBatchDialog
} from './batch';
import {
    BatchListPanelMiddlewareService, BATCH_LIST_PANEL_ID,
    batchListRoutePath, BatchListMainPanel, openBatchListPanel
} from './batchList';


import { CreateSampleDialog } from './sample';

const studiesCategoryName = "Studies";
const batchesCategoryName = "Batches";

export const register = (pluginConfig: PluginConfig) => {

    pluginConfig.centerPanelList.push((elms) => {
        elms.push(<Route path={studyListRoutePath} component={StudyListMainPanel} exact={true} />);
        elms.push(<Route path={studyRoutePath} component={StudyMainPanel} exact={true} />);
        elms.push(<Route path={patientRoutePath} component={PatientMainPanel} exact={true} />);
        elms.push(<Route path={batchListRoutePath} component={BatchListMainPanel} exact={true} />);
        return elms;
    });

    pluginConfig.newButtonMenuList.push((elms, menuItemClass) => {
        elms.push(<AddStudyMenuComponent className={menuItemClass} />);
        elms.push(<AddPatientMenuComponent className={menuItemClass} />);
        elms.push(<AddBiopsyMenuComponent className={menuItemClass} />);
        elms.push(<AddBatchMenuComponent className={menuItemClass} />);
        return elms;
    });

    pluginConfig.navigateToHandlers.push((dispatch: Dispatch, getState: () => RootState, uuid: string) => {
        if (uuid === studiesCategoryName) {
            dispatch(push(studyListRoutePath));
            return true;
        }
        if (uuid === batchesCategoryName) {
            dispatch(push(batchListRoutePath));
            return true;
        }
        if (uuid && uuid.startsWith(studyListRoutePath)) {
            dispatch(push(uuid));
            return true;
        }
        if (uuid && uuid.startsWith(patientBaseRoutePath)) {
            dispatch(push(uuid));
            return true;
        }
        return false;
    });

    pluginConfig.sidePanelCategories.push((cats: string[]): string[] => {
        cats.push(studiesCategoryName);
        cats.push(batchesCategoryName);
        return cats;
    });

    pluginConfig.locationChangeHandlers.push((store: RootStore, pathname: string): boolean => {
        if (matchPath(pathname, { path: studyListRoutePath, exact: true })) {
            store.dispatch(handleFirstTimeLoad(
                (dispatch: Dispatch) => {
                    dispatch<any>(openStudyListPanel);
                    dispatch<any>(activateSidePanelTreeItem(studiesCategoryName));
                    dispatch<any>(setSidePanelBreadcrumbs(studiesCategoryName));
                }));
            return true;
        }
        if (matchPath(pathname, { path: batchListRoutePath, exact: true })) {
            store.dispatch(handleFirstTimeLoad(
                (dispatch: Dispatch) => {
                    dispatch<any>(openBatchListPanel);
                    dispatch<any>(activateSidePanelTreeItem(batchesCategoryName));
                    dispatch<any>(setSidePanelBreadcrumbs(batchesCategoryName));
                }));
            return true;
        }
        const studyid = matchPath<StudyPathId>(pathname, { path: studyRoutePath, exact: true });
        if (studyid) {
            store.dispatch(handleFirstTimeLoad(
                (dispatch: Dispatch) => {
                    dispatch<any>(openStudyPanel(studyid.params.uuid));
                    // dispatch<any>(activateSidePanelTreeItem(studiesCategoryName));
                    // const name = getProperty(PATIENT_PANEL_CURRENT_UUID)(state.properties),
                    const rsc = getResource<GroupResource>(pathname)(store.getState().resources);
                    if (rsc) {
                        dispatch<any>(setBreadcrumbs([{ label: studiesCategoryName, uuid: studiesCategoryName }, { label: rsc.name, uuid: pathname }]));
                    }
                }));
            return true;
        }
        const patientid = matchPath<StudyPathId>(pathname, { path: patientRoutePath, exact: true });
        if (patientid) {
            store.dispatch(handleFirstTimeLoad(
                async (dispatch: Dispatch) => {
                    dispatch<any>(openPatientPanel(patientid.params.uuid));
                    // dispatch<any>(activateSidePanelTreeItem(studiesCategoryName));
                    const patientrsc = await dispatch<any>(loadResource(patientid.params.uuid));
                    if (patientrsc) {
                        const studyid = studyListRoutePath + "/" + patientrsc.ownerUuid;
                        const studyrsc = await dispatch<any>(loadResource(patientrsc.ownerUuid));
                        if (studyrsc) {
                            dispatch<any>(setBreadcrumbs([{ label: studiesCategoryName, uuid: studiesCategoryName },
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
    pluginConfig.dialogs.push(<CreateBiopsyDialog />);
    pluginConfig.dialogs.push(<CreateSampleDialog />);
    pluginConfig.dialogs.push(<CreateBatchDialog />);

    pluginConfig.middlewares.push((elms, services) => {
        elms.push(dataExplorerMiddleware(
            new StudyListPanelMiddlewareService(services, STUDY_LIST_PANEL_ID)
        ));
        elms.push(dataExplorerMiddleware(
            new PatientListPanelMiddlewareService(services, PATIENT_LIST_PANEL_ID)
        ));
        elms.push(dataExplorerMiddleware(
            new BiopsyListPanelMiddlewareService(services, BIOPSY_LIST_PANEL_ID)
        ));
        elms.push(dataExplorerMiddleware(
            new BatchListPanelMiddlewareService(services, BATCH_LIST_PANEL_ID)
        ));

        return elms;
    });

    addMenuActionSet(PATIENT_BIOPSY_MENU, patientBiopsyActionSet);
    addMenuActionSet(STUDY_CONTEXT_MENU, studyActionSet);
    addMenuActionSet(PATIENT_CONTEXT_MENU, patientListActionSet);
};
