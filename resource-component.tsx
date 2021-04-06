import * as React from 'react';
import { RootState } from '~/store/store';
import { getResource } from "~/store/resources/resources";
import { getProperty } from '~/store/properties/properties';
import { Resource } from '~/models/resource';
import { DispatchProp, connect } from 'react-redux';
import { GroupResource } from "~/models/group";

export interface PropertiedResource extends Resource {
    name: string;
    properties: any;
}

export const ResourceComponent = connect(
    (state: RootState, props: { uuid: string, render: (item: PropertiedResource) => React.ReactElement<any> }) => {
        const resource = getResource<PropertiedResource>(props.uuid)(state.resources);
        return { resource, render: props.render };
    })((props: { resource: PropertiedResource, render: (item: PropertiedResource) => React.ReactElement<any> } & DispatchProp<any>) => (props.resource ? props.render(props.resource) : <br />));


export const MultiResourceComponent = connect(
    (state: RootState, props: { uuid: string, lookupProperty: string, render: (item: PropertiedResource) => React.ReactElement<any> }) => {
        const reverse = getProperty<{ [key: string]: any[] }>(props.lookupProperty)(state.properties);
        let items = (reverse && reverse[props.uuid]) || [];
        items = items.map(item => {
            const rsc = getResource<GroupResource>(item)(state.resources);
            return rsc || { uuid: "", properties: {} };
        });
        return { items, render: props.render };
    })((props: { items: any[], render: (item: PropertiedResource) => React.ReactElement<any> } & DispatchProp<any>) => <>
        {props.items.map(item =>
            <div key={item.uuid} > {props.render(item)}</div>
        )}
    </>
    );
