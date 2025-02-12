import * as Utils from '../util/utils';
import Annotation, { WireAnnotation, _fromEncodedArray } from '../types/annotation';
import type RestChannel from './restchannel';
import type RealtimeChannel from './realtimechannel';
import Defaults from '../util/defaults';
import PaginatedResource, { PaginatedResult } from './paginatedresource';
import Resource from './resource';

export interface RestGetAnnotationsParams {
  limit?: number;
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

  async publish(refSerial: string, refType: string, data: any): Promise<void> {
    const annotation = Annotation.fromValues({
      action: 'annotation.create',
      refSerial,
      refType,
      data,
    });

    const wireAnnotation = await annotation.encode();

    const client = this.channel.client,
      options = client.options,
      format = options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Defaults.defaultPostHeaders(client.options, { format }),
      params = {};

    const requestBody = Utils.encodeBody([wireAnnotation], client._MsgPack, format);

    await Resource.post(client, basePathForSerial(this.channel, refSerial), requestBody, headers, params, null, true);
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
