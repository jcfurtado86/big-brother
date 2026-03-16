import { useViewer } from '../../contexts/ViewerContext';
import { useLayerState } from '../../contexts/LayerContext';
import { useWeatherLayer } from '../../hooks/useWeatherLayer';

export default function WeatherManager() {
  const viewer = useViewer();
  const weather = useLayerState('weather');
  useWeatherLayer(viewer, weather.show, weather.opacity);
  return null;
}
