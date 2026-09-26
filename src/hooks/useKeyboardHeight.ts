import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';

/** Height of the on-screen keyboard in points, or 0 when it's hidden. */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // iOS sends "will" events in time to move things with the keyboard.
    const show =
      Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subscriptions = [
      // How much of the window the keyboard covers: 0 once it has slid away,
      // even though a hiding keyboard still reports its full height.
      Keyboard.addListener(show, event =>
        setHeight(
          Math.max(
            0,
            Dimensions.get('window').height - event.endCoordinates.screenY,
          ),
        ),
      ),
      Keyboard.addListener(hide, () => setHeight(0)),
    ];
    return () => subscriptions.forEach(s => s.remove());
  }, []);

  return height;
}
