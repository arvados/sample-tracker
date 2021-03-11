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
import { setSidePanelBreadcrumbs } from '~/store/breadcrumbs/breadcrumbs-actions';
import { Location } from 'history';
import { handleFirstTimeLoad } from '~/store/workbench/workbench-actions';
import {
    AddStudyMenuComponent, StudiesMainPanel, CreateStudyDialog,
    studyPanelColumns, studyPanelActions, openStudiesPanel,
    StudiesPanelMiddlewareService, STUDY_PANEL_ID
} from './study';
import { dataExplorerMiddleware } from "~/store/data-explorer/data-explorer-middleware";

const categoryName = "Studies";
export const routePath = "/sample_tracker_Studies";

export const register = (pluginConfig: PluginConfig) => {

    pluginConfig.centerPanelList.push((elms) => {
        elms.push(<Route path={routePath} component={StudiesMainPanel} />);
        return elms;
    });

    pluginConfig.newButtonMenuList.push((elms, menuItemClass) => {
        elms.push(<AddStudyMenuComponent className={menuItemClass} />);
        return elms;
    });

    pluginConfig.navigateToHandlers.push((dispatch: Dispatch, getState: () => RootState, uuid: string) => {
        if (uuid === categoryName) {
            dispatch(push(routePath));
            return true;
        }
        return false;
    });

    pluginConfig.sidePanelCategories.push((cats: string[]): string[] => { cats.push(categoryName); return cats; });

    pluginConfig.locationChangeHandlers.push((store: RootStore, pathname: string): boolean => {
        if (matchPath(pathname, { path: routePath, exact: true })) {
            store.dispatch(handleFirstTimeLoad(
                (dispatch: Dispatch) => {
                    dispatch(studyPanelActions.SET_COLUMNS({ columns: studyPanelColumns }));
                    dispatch<any>(openStudiesPanel);
                    dispatch<any>(activateSidePanelTreeItem(categoryName));
                    dispatch<any>(setSidePanelBreadcrumbs(categoryName));
                }));
            return true;
        }
        return false;
    });

    pluginConfig.enableNewButtonMatchers.push((location: Location) => (!!matchPath(location.pathname, { path: routePath, exact: true })));

    pluginConfig.dialogs.push(<CreateStudyDialog />);

    pluginConfig.middlewares.push((elms, services) => {
        elms.push(dataExplorerMiddleware(
            new StudiesPanelMiddlewareService(services, STUDY_PANEL_ID)
        ));
        return elms;
    });

};
