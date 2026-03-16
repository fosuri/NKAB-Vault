import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";

interface ForgotPasswordEmailProps {
  username: string, 
  resetUrl: string,
  userEmail: string
}

const ForgotPasswordEmail = (props: ForgotPasswordEmailProps) => {
  const { username, resetUrl, userEmail } = props;



  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Preview>Reset your password - Action required</Preview>
        <Body className="bg-gray-100 font-sans py-10">
          <Container className="bg-white rounded-[8px] shadow-lg max-w-145 mx-auto p-10">
            <Section className="text-center mb-8">
              <Heading className="text-[28px] font-bold text-gray-900 m-0 mb-2">
                Reset Your Password
              </Heading>
              <Text className="text-[16px] text-gray-600 m-0">
                We received a request to reset your password
              </Text>
            </Section>

            <Section className="mb-8">
              <Text className="text-[16px] text-gray-700 leading-6 m-0 mb-4">
                Hello, {username}
              </Text>
              <Text className="text-[16px] text-gray-700 leading-6 m-0 mb-6">
                We received a password reset request for your account associated
                with <strong>{userEmail}</strong>.
              </Text>
              <Text className="text-[16px] text-gray-700 leading-6 m-0 mb-6">
                Click the button below to create a new password. This link will
                expire in 24 hours for security reasons.
              </Text>

              <Section className="text-center mb-6">
                <Button
                  href={resetUrl}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-[6px] text-[16px] no-underline box-border"
                >
                  Reset My Password
                </Button>
              </Section>

              <Text className="text-[14px] text-gray-600 leading-5 m-0 mb-4">
                If the button above doesn&apos;t work, copy and paste this link into
                your browser:
              </Text>
              <Text className="text-[14px] text-blue-600 leading-5 m-0 mb-6 break-all">
                <Link href={resetUrl} className="text-blue-600 underline">
                  {resetUrl}
                </Link>
              </Text>

              <Section className="bg-amber-50 border border-amber-200 rounded-[6px] p-4 mb-6">
                <Text className="text-[14px] text-amber-800 leading-5 m-0 mb-2 font-semibold">
                  Security Notice
                </Text>
                <Text className="text-[14px] text-amber-700 leading-5 m-0">
                  If you didn&apos;t request this password reset, please ignore this
                  email. Your account remains secure and no changes have been
                  made.
                </Text>
              </Section>

              <Text className="text-[14px] text-gray-600 leading-5 m-0">
                Need help? Contact our support team and we&apos;ll be happy to assist
                you.
              </Text>
            </Section>

            <Section className="border-t border-gray-200 pt-6">
              <Text className="text-[12px] text-gray-500 leading-4 m-0 mb-2">
                This email was sent to {userEmail}
              </Text>
              <Text className="text-[12px] text-gray-500 leading-4 m-0 mb-2">
                © 2026 Your Company Name. All rights reserved.
              </Text>
              <Text className="text-[12px] text-gray-500 leading-4 m-0">
                123 Business Street, Jõhvi, Estonia |{" "}
                <Link href="#" className="text-gray-500 underline">
                  Unsubscribe
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};


export default ForgotPasswordEmail;
