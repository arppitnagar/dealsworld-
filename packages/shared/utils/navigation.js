// Falls back to a known route instead of letting goBack() throw
// "GO_BACK not handled" when the screen has no back-stack entry
// (e.g. reached via deep link, push notification, or after a
// Fast Refresh reset during development).
export function goBackOrNavigate(navigation, fallbackRouteName = "MainTabs") {
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else {
    navigation.navigate(fallbackRouteName);
  }
}
