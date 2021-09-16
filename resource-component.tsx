// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { RootState } from 'store/store';
import { getResource } from "store/resources/resources";
import { getProperty } from 'store/properties/properties';
import { Resource } from 'models/resource';
import { DispatchProp, connect } from 'react-redux';
import { GroupResource } from "models/group";
import { ArvadosTheme } from 'common/custom-theme';
import { withStyles, WithStyles, StyleRulesCallback } from '@material-ui/core/styles';
import classNames from 'classnames';

export interface PropertiedResource extends Resource {
    name: string;
    description: string;
    properties: any;
}

export const PropertyComponent = (props: { resource: PropertiedResource, propertyname: string }) =>
    <span>{props.resource.properties[props.propertyname]}</span>;

export const ResourceComponent = connect(
    (state: RootState, props: { uuid: string, render: (item: PropertiedResource) => React.ReactElement<any> }) => {
        const resource = getResource<PropertiedResource>(props.uuid)(state.resources);
        return { resource, render: props.render };
    })((props: { resource: PropertiedResource, render: (item: PropertiedResource) => React.ReactElement<any> } & DispatchProp<any>) => (props.resource ? props.render(props.resource) : <br />));


type CssRules = 'lineHeight';

const styles: StyleRulesCallback<CssRules> = (theme: ArvadosTheme) => ({
    lineHeight: {
        lineHeight: "21px",
        height: "21px",
        whiteSpace: "nowrap"
    }
});

export const MultiResourceComponent = withStyles(styles)(connect(
    (state: RootState, props: {
        uuid: string, lookupProperty: string,
        render: (item: PropertiedResource) => React.ReactElement<any>
    }) => {
        const reverse = getProperty<{ [key: string]: any[] }>(props.lookupProperty)(state.properties);
        let items = (reverse && reverse[props.uuid]) || [];
        items = items.map(item => {
            const rsc = getResource<GroupResource>(item)(state.resources);
            return rsc || { uuid: "", properties: {} };
        });
        return { items, render: props.render };
    })((props: { items: any[], render: (item: PropertiedResource) => React.ReactElement<any> } & DispatchProp<any> & WithStyles<CssRules>) => <>
        {props.items.map(item =>
            <div className={classNames(props.classes.lineHeight)} key={item.uuid} > {props.render(item)}</div>
        )}
    </>
    ));
