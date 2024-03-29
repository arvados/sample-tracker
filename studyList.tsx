// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { ServiceRepository } from "services/services";
import { MiddlewareAPI, Dispatch } from "redux";
import { RootState } from 'store/store';
import { DataExplorer } from "views-components/data-explorer/data-explorer";
import { DataTableDefaultView } from 'components/data-table-default-view/data-table-default-view';
import { DataColumns } from 'components/data-table/data-table';
import { createTree } from 'models/tree';
import { SortDirection } from 'components/data-table/data-column';
import { bindDataExplorerActions } from "store/data-explorer/data-explorer-action";
import {
    DataExplorerMiddlewareService,
    listResultsToDataExplorerItemsMeta,
    dataExplorerToListParams
} from 'store/data-explorer/data-explorer-middleware-service';
import { GroupResource } from "models/group";
import { ListResults } from 'services/common-service/common-service';
import { progressIndicatorActions } from 'store/progress-indicator/progress-indicator-actions';
import { DataExplorer as DataExplorerState, getDataExplorer } from 'store/data-explorer/data-explorer-reducer';
import { FilterBuilder, joinFilters } from "services/api/filter-builder";
import { updateResources } from "store/resources/resources-actions";
import { ResourceName } from 'views-components/data-explorer/renderers';
import { sampleTrackerStudy } from "./metadataTerms";
import { openContextMenu } from 'store/context-menu/context-menu-actions';
import { ResourceKind } from 'models/resource';
import { DispatchProp, connect } from 'react-redux';
import { treePickerActions } from "store/tree-picker/tree-picker-actions";
import { SIDE_PANEL_TREE } from "store/side-panel-tree/side-panel-tree-actions";
import { getNodeAncestors, getNodeAncestorsIds, getNode, TreeNode, initTreeNode, TreeNodeStatus } from 'models/tree';

export const STUDY_LIST_PANEL_ID = "studyPanel";
export const studyListPanelActions = bindDataExplorerActions(STUDY_LIST_PANEL_ID);
export const studyListRoutePath = "/sampleTracker/Studies";
export const studyRoutePath = studyListRoutePath + "/:uuid";
export const STUDY_CONTEXT_MENU = "studyContextMenu";

enum StudyPanelColumnNames {
    NAME = "Name"
}

export const studyListPanelColumns: DataColumns<string> = [
    {
        name: StudyPanelColumnNames.NAME,
        selected: true,
        configurable: true,
        sortDirection: SortDirection.NONE,
        filters: createTree(),
        render: uuid => <ResourceName uuid={uuid} />
    }
];

export const openStudyListPanel = (dispatch: Dispatch) => {
    // dispatch(propertiesActions.SET_PROPERTY({ key: PROJECT_PANEL_CURRENT_UUID, value: projectUuid }));
    dispatch(studyListPanelActions.SET_COLUMNS({ columns: studyListPanelColumns }));
    dispatch(studyListPanelActions.REQUEST_ITEMS());
};


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
            menuKind: STUDY_CONTEXT_MENU
        }));
    };

export const StudyListMainPanel = connect()(
    ({ dispatch }: DispatchProp<any>) =>
        <DataExplorer
            id={STUDY_LIST_PANEL_ID}
            onRowClick={(uuid: string) => { }}
            onRowDoubleClick={(uuid: string) => { }}
            onContextMenu={handleContextMenu(dispatch)}
            contextMenuColumn={true}
            dataTableDefaultView={
                <DataTableDefaultView />
            } />);


const setItems = (listResults: ListResults<GroupResource>) =>
    studyListPanelActions.SET_ITEMS({
        ...listResultsToDataExplorerItemsMeta(listResults),
        items: listResults.items.map(resource => resource.uuid),
    });

const getFilters = (dataExplorer: DataExplorerState) => {
    //    const columns = dataExplorer.columns as DataColumns<string>;
    //    const typeFilters = serializeResourceTypeFilters(getDataExplorerColumnFilters(columns, ProjectPanelColumnNames.TYPE));
    //    const statusColumnFilters = getDataExplorerColumnFilters(columns, 'Status');
    //    const activeStatusFilter = Object.keys(statusColumnFilters).find(
    //        filterName => statusColumnFilters[filterName].selected
    //    );
    const fb = new FilterBuilder();
    fb.addEqual("properties.type", sampleTrackerStudy);

    const nameFilters = new FilterBuilder()
        .addILike("name", dataExplorer.searchValue)
        .getFilters();

    return joinFilters(
        fb.getFilters(),
        nameFilters,
    );
};

const getParams = (dataExplorer: DataExplorerState) => ({
    ...dataExplorerToListParams(dataExplorer),
    filters: getFilters(dataExplorer),
});


export class StudyListPanelMiddlewareService extends DataExplorerMiddlewareService {
    constructor(private services: ServiceRepository, id: string) {
        super(id);
    }

    async requestItems(api: MiddlewareAPI<Dispatch, RootState>) {
        const state = api.getState();
        const dataExplorer = getDataExplorer(state.dataExplorer, this.getId());

        try {
            api.dispatch(progressIndicatorActions.START_WORKING(this.getId()));
            const response = await this.services.groupsService.list(getParams(dataExplorer));
            api.dispatch(progressIndicatorActions.PERSIST_STOP_WORKING(this.getId()));
            for (const i of response.items) {
                i.uuid = studyListRoutePath + "/" + i.uuid;
            }
            api.dispatch(updateResources(response.items));
            api.dispatch(setItems(response));

            const nodes = response.items.map(item => initTreeNode({ id: item.uuid, value: item, parent: "Studies" }));

            api.dispatch(treePickerActions.LOAD_TREE_PICKER_NODE_SUCCESS({
                id: "Studies",
                pickerId: SIDE_PANEL_TREE,
                nodes
            }));
        } catch (e) {
            api.dispatch(progressIndicatorActions.PERSIST_STOP_WORKING(this.getId()));
            api.dispatch(studyListPanelActions.SET_ITEMS({
                items: [],
                itemsAvailable: 0,
                page: 0,
                rowsPerPage: dataExplorer.rowsPerPage
            }));
            // api.dispatch(couldNotFetchProjectContents());
        }
    }
}
