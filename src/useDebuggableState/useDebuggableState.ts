import { useState, useMemo, useRef, Dispatch, SetStateAction } from 'react';
import { SourceMapConsumer, RawSourceMap } from 'source-map';
import { SourceMapConsumerConstructorWithInitialize } from '../types';

declare const window: any;

export interface SourceMapConsumers {
  [key: string]: SourceMapConsumer|string|boolean;
}

export interface StateChange {
  toValue: any;
  fromValue: any;
  propName: string;
  line: number;
  linePreview: string;
  trace: string;
  fullTrace: string;
  sourceMaps: SourceMapConsumers;
}

export interface Config {
  defaultPropName: string;
  esVersion: string;
  mappingsLocation: string;
}

export interface StateChangesInterface {
  changes: StateChange[];
  debugging: boolean;
  sourceMapConsumers: SourceMapConsumers;
  initialised: boolean;
  push(fromValue: any, toValue: any): void;
  last(number: number): StateChange[];
  startCapture(): void;
  stopCapture(): void;
}

export const StateChanges = {
  changes: [],
  debugging: false,
  sourceMapConsumers: {},
  initialised: false,
  async push(fromValue: any, toValue: any) {
    if (this.debugging) {
      // setup constants
      const indent = '  ';
      const ellipsis = '...';
      const urlRegex = /\(?(http.*\.js):(\d+):(\d+)\)?$/;
      const change = {} as StateChange;
      const stackTrace = [] as String[];
      const config: Config = {
        defaultPropName: process.env.npm_package_config_usedebuggablestate_defaultpropname || '?',
        esVersion: process.env.npm_package_config_usedebuggablestate_esversion || 'latest',
        mappingsLocation: process.env.npm_package_config_usedebuggablestate_mappingslocation || 'https://unpkg.com/source-map@0.7.3/lib/mappings.wasm',
      }

      // setup mutable variables
      let propName = config.defaultPropName;
      let linePreview = '';
      let capturing = 1.0;

      // initialize SourceMapConsumer
      if (!this.initialised) {
        const SourceMapConsumerWithInitialize = SourceMapConsumer as SourceMapConsumerConstructorWithInitialize;
        SourceMapConsumerWithInitialize.initialize({
          'lib/mappings.wasm': config.mappingsLocation,
        });
        this.initialised = true;
      }

      // Generate Stack Trace
      const tmpObj = {} as any;
      Error.captureStackTrace(tmpObj, this.push);
      change.trace = tmpObj.stack.replace('Error', `StateChangeEvent (from: ${fromValue}, to: ${toValue})`);
      delete tmpObj.stack;

      // fix terrible stacktrace output
      const lines = change.trace.split('\n');
      for (const lineIndex in lines) {
        let line = lines[lineIndex];
        // remove initial indentation
        line = line.replace(/^\s+/, '');

        if (capturing > 0) {
          const source = line.match(urlRegex);
          if (source) {
            // getting sourcemap location based on generated filename
            // @TODO: maybe provide a way to set sourcemap locations?
            const sourceMap = source[1] + '.map';
            const generatedLine = Number(source[2]);
            const generatedColumn = Number(source[3]);

            // wait for sourceMap to load or be rejected if fetching
            // otherwise we'll get a bunch of overlapping network requests
            while (this.sourceMapConsumers[sourceMap] === 'fetching') {
              await new Promise((resolve) => {
                setTimeout(resolve, 100);
              });
            }

            // if wasn't fetched, we'll do that now
            if (typeof this.sourceMapConsumers[sourceMap] === 'undefined') {
              this.sourceMapConsumers[sourceMap] = 'fetching';
              try {
                const sourceMapContent = await fetch(sourceMap).then((res) => res.json());
                this.sourceMapConsumers[sourceMap] = await new SourceMapConsumer(sourceMapContent as RawSourceMap);
              } catch (err) {
                this.sourceMapConsumers[sourceMap] = false;
              }
            }

            const consumer = this.sourceMapConsumers[sourceMap];
            if (typeof consumer === 'object') {
              //
              const { source, line: lineNumber, column: columnNumber } = consumer.originalPositionFor({
                line: generatedLine,
                column: generatedColumn,
              });

              line = line.replace(
                urlRegex,
                `(${source}:${lineNumber}:${columnNumber})`
              );
              if (lineNumber !== null) {
                line += '\n└';
                line += indent.repeat(1);
                linePreview = consumer.sourceContentFor(source || '')?.split('\n')[lineNumber - 1]?.replace(/^\s+/, '') || '';
                line += linePreview;
              }
            }
          }

          stackTrace.push(line);

          // If we hit useDebuggableState, then scrap the rest until
          // we hit the dispatchAction
          if (line.match(/at useDebuggableState/)) {
            // unless fromValue is undefined, which means we're setting the
            // initial value, the next line will be the Provider, so include that
            // by delaying the stoppage of capture
            if (fromValue === undefined) {
              capturing -= 0.5;
            } else {
              capturing = 0;
            }
          } else if (capturing === 0.5) {
            // @TODO: something smart with acorn
            const propNameMatch = line.match(/\s*const\s+\[(.*),(.*)\].*/);
            if (propNameMatch !== null) {
              propName = propNameMatch[1];
              capturing = 0;
            }
          }

          if (capturing <= 0) {
            stackTrace.push(ellipsis);
          }
        } else if (line.match(/^at dispatchAction/)) {
          capturing = 1;
        }
      }

      change.fullTrace = change.trace;
      change.trace = stackTrace.join('\n');
      change.fromValue = fromValue;
      change.toValue = toValue;
      change.propName = propName;
      change.linePreview = linePreview;
      this.changes.push(change);
    }
  },
  last(number: number = 1): StateChange[] {
    return this.changes.slice(0 - number);
  },
  startCapture() {
    this.debugging = true;
  },
  stopCapture() {
    this.debugging = false;
  },
} as StateChangesInterface;

export function useDebuggableState<S>(initialState: any): [S, Dispatch<SetStateAction<S>>] {
  const [state, setState] = useState(initialState);
  const prevStateRef = useRef<any>();
  prevStateRef.current = undefined;

  useMemo(() => {
    if (window.reactDebugMode === true) {
      window.reactDebug = window.reactDebug || {};
      if (typeof window.reactDebug.state === 'undefined') {
        window.reactDebug.state = StateChanges;
        window.reactDebug.state.startCapture();
      }
      window.reactDebug.state.push(prevStateRef.current, state);
    }
    prevStateRef.current = state;
  }, [state]);

  return [state, setState];
}

export default useDebuggableState;
