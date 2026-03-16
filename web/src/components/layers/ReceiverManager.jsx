import { useViewer } from '../../contexts/ViewerContext';
import { useLayerState } from '../../contexts/LayerContext';
import { useAdsbReceivers } from '../../hooks/useAdsbReceivers';
import { useAisStations } from '../../hooks/useAisStations';
import { useReceiverLayer } from '../../hooks/useReceiverLayer';
import { useSelectionHandler } from '../../contexts/SelectionContext';

export default function ReceiverManager({ onReceiverSelect }) {
  const viewer = useViewer();
  const receivers = useLayerState('receivers');

  const adsbReceivers = useAdsbReceivers(receivers.adsbShow);
  const aisStations   = useAisStations(receivers.aisShow);
  const { receiversRef: adsbReceiversRef } = useReceiverLayer(viewer, adsbReceivers, 'adsb', receivers.adsbShow, receivers.adsbOpacity);
  const { receiversRef: aisStationsRef }  = useReceiverLayer(viewer, aisStations, 'ais', receivers.aisShow, receivers.aisOpacity);

  useSelectionHandler('receiver', {
    match: (id) => id?.startsWith('receiver_'),
    onSelect: (id) => {
      const rest = id.slice(9);
      const isAdsb = rest.startsWith('adsb_');
      const receiverId = isAdsb ? rest.slice(5) : rest.slice(4);
      const receiverType = isAdsb ? 'adsb' : 'ais';
      const mapRef = isAdsb ? adsbReceiversRef : aisStationsRef;
      const data = mapRef?.current?.get(receiverId);
      if (data) {
        onReceiverSelect?.({ ...data, type: receiverType });
      }
    },
    onClear: () => {
      onReceiverSelect?.(null);
    },
  });

  return null;
}
