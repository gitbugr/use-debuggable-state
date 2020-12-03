import { SourceMapConsumerConstructor } from "source-map";

export interface SourceMapConsumerConstructorWithInitialize extends SourceMapConsumerConstructor {
  initialize(object: any): void;
}
