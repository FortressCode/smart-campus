declare module 'react-big-calendar' {
  import { Component, ComponentType, ReactNode } from 'react';

  export interface Event {
    title: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    resource?: any;
  }

  export interface View {
    name: string;
    component: ComponentType<any>;
  }

  export interface ViewsProps {
    month?: boolean | View;
    week?: boolean | View;
    work_week?: boolean | View;
    day?: boolean | View;
    agenda?: boolean | View;
  }

  export interface CalendarProps {
    localizer: any;
    events: Event[];
    views?: ViewsProps | View[] | string[];
    defaultView?: string;
    defaultDate?: Date;
    startAccessor?: string | ((event: Event) => Date);
    endAccessor?: string | ((event: Event) => Date);
    style?: Object;
    popup?: boolean;
    popupOffset?: number | { x: number; y: number };
    selectable?: boolean;
    components?: {
      event?: ComponentType<any>;
      agenda?: {
        event?: ComponentType<any>;
      };
      day?: {
        event?: ComponentType<any>;
      };
      month?: {
        event?: ComponentType<any>;
      };
      week?: {
        event?: ComponentType<any>;
      };
      toolbar?: ComponentType<any>;
    };
    onSelectEvent?: (event: Event) => void;
    onSelectSlot?: (slotInfo: { start: Date; end: Date; slots: Date[] }) => void;
    onDoubleClickEvent?: (event: Event) => void;
    onNavigate?: (date: Date, view: string, action: string) => void;
    onView?: (view: string) => void;
    date?: Date;
    length?: number;
    dayPropGetter?: (date: Date) => { className?: string; style?: Object };
    eventPropGetter?: (event: Event) => { className?: string; style?: Object };
    showMultiDayTimes?: boolean;
    min?: Date;
    max?: Date;
    formats?: any;
    culture?: string;
  }

  export class Calendar extends Component<CalendarProps> {}

  export function dateFnsLocalizer(args: any): any;
  export function momentLocalizer(moment: any): any;
  export function globalizeLocalizer(globalize: any): any;

  export const Views: {
    MONTH: string;
    WEEK: string;
    WORK_WEEK: string;
    DAY: string;
    AGENDA: string;
  };

  export default Calendar;
} 