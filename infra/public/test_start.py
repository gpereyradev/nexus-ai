import unittest
from start import ConfigurationError, analytics_environment, environment


class PublicEnvironmentTest(unittest.TestCase):
    def test_url_decodes_credentials_and_does_not_forward_connection_url(self):
        env = environment({"DATABASE_URL": "postgresql://demo:p%40ss%3Aword@db.example/neondb?sslmode=require"})
        self.assertEqual(env["DB_PASSWORD"], "p@ss:word")
        self.assertEqual(env["DB_HOST"], "db.example")
        self.assertNotIn("DATABASE_URL", env)
        self.assertNotIn("DB_SSL_MODE", env)  # public profile retains verify-full

    def test_invalid_connections_do_not_disclose_credentials(self):
        for url in ("https://demo:sensitive@db.example/db", "postgresql://demo:sensitive@db.example:invalid/db",
                    "postgresql://demo:sensitive@db.example/db?ignored=1#fragment",
                    "postgresql://demo:sensitive@db.example/db%3Fsslmode%3Ddisable"):
            with self.subTest(url=url), self.assertRaises(ConfigurationError) as result:
                environment({"DATABASE_URL": url})
            self.assertNotIn("sensitive", str(result.exception))

    def test_missing_database_and_placeholder_key_fail_before_processes_start(self):
        with self.assertRaises(ConfigurationError):
            environment({})
        with self.assertRaises(ConfigurationError):
            environment({"DATABASE_URL": "postgres://demo:fixture@db.example/neondb",
                         "ANALYTICS_ENABLED": "true", "ANALYTICS_API_KEY": "CHANGE_ME" * 8})

    def test_python_has_no_database_or_account_credentials(self):
        env = analytics_environment({"DB_PASSWORD": "db-fixture", "DEMO_ADMIN_PASSWORD": "admin-fixture",
                                     "SPRING_DATASOURCE_PASSWORD": "spring-fixture", "DATABASE_URL": "fixture",
                                     "ANALYTICS_API_KEY": "private-fixture", "PATH": "/usr/bin"})
        self.assertEqual(env, {"ANALYTICS_API_KEY": "private-fixture", "PATH": "/usr/bin"})


if __name__ == "__main__":
    unittest.main()
