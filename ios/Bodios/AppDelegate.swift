import UIKit

/// iOS 27 only launches apps that use the scene lifecycle, so the window and
/// React Native are set up in SceneDelegate.swift instead of here. This
/// mirrors React Native's 0.88 template.
@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    true
  }
}
