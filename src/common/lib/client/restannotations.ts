import * as Utils from '../util/utils';
import Annotation, { WireAnnotation, _fromEncodedArray } from '../types/annotation';
import type Message from '../types/message';
import type RestChannel from './restchannel';
import type RealtimeChannel from './realtimechannel';
import Defaults from '../util/defaults';
import PaginatedResource, { PaginatedResult } from './paginatedresource';
import Resource from './resource';
import type { Properties } from '../util/utils';
import ErrorInfo from '../types/errorinfo';

export interface RestGetAnnotationsParams {
  limit?: number;
}

export function constructValidateAnnotation(msgOrSerial: string | Message, annotationValues: Partial<Properties<Annotation>>): Annotation {
  let messageSerial: string | undefined;
  switch (typeof msgOrSerial) {
    case 'string':
      messageSerial = msgOrSerial;
    break;
    case 'object':
      messageSerial = msgOrSerial.serial;
    break;
  }
  if (!messageSerial || typeof messageSerial !== 'string') {
    throw new ErrorInfo('First argument of annotation.publish() must be either a Message (or at least an object with a string `serial` property) or a message serial (string)', 40003, 400);
  }

  if (!annotationValues || typeof annotationValues !== 'object') {
    throw new ErrorInfo('Second argument of annotation.publish() must be an object (the intended annotation to publish)', 40003, 400);
  }

  const annotation = Annotation.fromValues(annotationValues);
  if (!annotation.action) {
    annotation.action = 'annotation.create';
  }
  return annotation;
}

function basePathForSerial(channel: RestChannel | RealtimeChannel, serial: string) {
  return (
    channel.client.rest.channelMixin.basePath(channel) + '/messages/' + encodeURIComponent(serial) + '/annotations'
  );
}

class RestAnnotations {
  private channel: RestChannel;

  constructor(channel: RestChannel) {
    this.channel = channel;
  }

  async publish(msgOrSerial: string | Message, annotationValues: Partial<Properties<Annotation>>): Promise<void> {
    const annotation = constructValidateAnnotation(msgOrSerial, annotationValues);
    const wireAnnotation = await annotation.encode();

    const client = this.channel.client,
      options = client.options,
      format = options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Defaults.defaultPostHeaders(client.options, { format }),
      params = {};

    const requestBody = Utils.encodeBody([wireAnnotation], client._MsgPack, format);

    await Resource.post(client, basePathForSerial(this.channel, messageSerial), requestBody, headers, params, null, true);
  }

  async get(serial: string, params: RestGetAnnotationsParams | null): Promise<PaginatedResult<Annotation>> {
    const client = this.channel.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = client.http.supportsLinkHeaders ? undefined : format,
      headers = Defaults.defaultGetHeaders(client.options, { format });

    Utils.mixin(headers, client.options.headers);

    return new PaginatedResource(
      client,
      basePathForSerial(this.channel, serial),
      headers,
      envelope,
      async (body, _, unpacked) => {
        const decoded = (
          unpacked ? body : Utils.decodeBody(body, client._MsgPack, format)
        ) as Utils.Properties<WireAnnotation>[];

        return _fromEncodedArray(decoded, this.channel);
      },
    ).get(params as Record<string, unknown>);
  }
}

export default RestAnnotations;
