// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { InjectedFormProps } from 'redux-form';
import { WithDialogProps } from '~/store/dialog/with-dialog';
import { ProjectCreateFormDialogData } from '~/store/projects/project-create-actions';
import { FormDialog } from '~/components/form-dialog/form-dialog';
import { ProjectNameField, ProjectDescriptionField } from '~/views-components/form-fields/project-form-fields';
import { dialogActions } from "~/store/dialog/dialog-actions";
import { ServiceRepository } from "~/services/services";
import { compose, MiddlewareAPI, Dispatch } from "redux";
import { reduxForm, initialize } from 'redux-form';
import { withDialog } from "~/store/dialog/with-dialog";
import { RootState } from '~/store/store';
import { DispatchProp, connect } from 'react-redux';
import { MenuItem } from "@material-ui/core";
import { createProject } from "~/store/workbench/workbench-actions";
import { DataExplorer } from "~/views-components/data-explorer/data-explorer";
import { DataTableDefaultView } from '~/components/data-table-default-view/data-table-default-view';
import { DataColumns } from '~/components/data-table/data-table';
import { createTree } from '~/models/tree';
import { SortDirection } from '~/components/data-table/data-column';
import { bindDataExplorerActions } from "~/store/data-explorer/data-explorer-action";
import {
    DataExplorerMiddlewareService,
    listResultsToDataExplorerItemsMeta,
    dataExplorerToListParams
} from '~/store/data-explorer/data-explorer-middleware-service';
import { GroupResource } from "~/models/group";
import { ListResults } from '~/services/common-service/common-service';
import { progressIndicatorActions } from '~/store/progress-indicator/progress-indicator-actions.ts';
import { DataExplorer as DataExplorerState, getDataExplorer } from '~/store/data-explorer/data-explorer-reducer';
import { FilterBuilder, joinFilters } from "~/services/api/filter-builder";
import { updateResources } from "~/store/resources/resources-actions";
import { ResourceName } from '~/views-components/data-explorer/renderers';

const STUDY_CREATE_FORM_NAME = "studyCreateFormName";
export const STUDY_LIST_PANEL_ID = "studyPanel";
export const studyListPanelActions = bindDataExplorerActions(STUDY_LIST_PANEL_ID);
export const sampleTrackerStudyType = "sample_tracker:study";
export const studyListRoutePath = "/sample_tracker_Studies";

export interface ProjectCreateFormDialogData {
    ownerUuid: string;
    name: string;
    description: string;
}

type DialogProjectProps = WithDialogProps<{}> & InjectedFormProps<ProjectCreateFormDialogData>;

const StudyAddFields = () => <span>
    <ProjectNameField label="Study name" />
    <ProjectDescriptionField />
</span>;

const DialogStudyCreate = (props: DialogProjectProps) =>
    <FormDialog
        dialogTitle='New study'
        formFields={StudyAddFields}
        submitLabel='Create a Study'
        {...props}
    />;

export const CreateStudyDialog = compose(
    withDialog(STUDY_CREATE_FORM_NAME),
    reduxForm<ProjectCreateFormDialogData>({
        form: STUDY_CREATE_FORM_NAME,
        onSubmit: (data, dispatch) => {
            data.properties = { type: sampleTrackerStudyType };
            dispatch(createProject(data));
        }
    })
)(DialogStudyCreate);


interface TrackerProps {
    className?: string;
}

const studiesMapStateToProps = (state: RootState) => ({});

const openStudyCreateDialog = () =>
    (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        dispatch(initialize(STUDY_CREATE_FORM_NAME, {}));
        dispatch(dialogActions.OPEN_DIALOG({ id: STUDY_CREATE_FORM_NAME, data: {} }));
    };

export const AddStudyMenuComponent = connect(studiesMapStateToProps)(
    ({ dispatch, className }: TrackerProps & DispatchProp<any>) =>
        <MenuItem className={className} onClick={() => dispatch(openStudyCreateDialog())}>Add Study</MenuItem >
);

enum StudyPanelColumnNames {
    NAME = "Name"
}

/* const renderName = (dispatch: Dispatch, item: GroupContentsResource) =>
 *     <Grid container alignItems="center" wrap="nowrap" spacing={16}>
 *         <Grid item>
 *             {renderIcon(item)}
 *         </Grid>
 *         <Grid item>
 *             <Typography color="primary" style={{ width: 'auto', cursor: 'pointer' }} onClick={() => dispatch<any>(navigateTo(item.uuid))}>
 *                 {item.kind === ResourceKind.PROJECT || item.kind === ResourceKind.COLLECTION
 *                     ? <IllegalNamingWarning name={item.name} />
 *                     : null}
 *                 {item.name}
 *             </Typography>
 *         </Grid>
 *         <Grid item>
 *             <Typography variant="caption">
 *                 <FavoriteStar resourceUuid={item.uuid} />
 *                 <PublicFavoriteStar resourceUuid={item.uuid} />
 *             </Typography>
 *         </Grid>
 *     </Grid>;
 *
 * const ResourceName = connect(
 *     (state: RootState, props: { uuid: string }) => {
 *         const resource = getResource<GroupResource>(props.uuid)(state.resources);
 *         return resource;
 *     })((resource: GroupResource & DispatchProp<any>) => renderName(resource.dispatch, resource));
 *  */
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
    dispatch(studyListPanelActions.REQUEST_ITEMS());
};

export const StudyListMainPanel = connect(studiesMapStateToProps)(
    ({ }: TrackerProps) =>
        <DataExplorer
            id={STUDY_LIST_PANEL_ID}
            onRowClick={(uuid: string) => { }}
            onRowDoubleClick={(uuid: string) => { }}
            onContextMenu={(event: React.MouseEvent<HTMLElement>, resourceUuid: string) => { }}
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
    fb.addEqual("properties.type", sampleTrackerStudyType);

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
