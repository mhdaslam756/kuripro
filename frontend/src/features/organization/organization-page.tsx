import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BusinessHoursTab } from "./business-hours-tab";
import { CompanyProfileTab } from "./company-profile-tab";
import { LogoTab } from "./logo-tab";
import { SettingsTab } from "./settings-tab";
import { SubscriptionTab } from "./subscription-tab";
import { useOrganization } from "./use-organization";

export function OrganizationPage() {
  const { data: organization, isLoading, isError } = useOrganization();

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-text-primary">Organization</h1>
      <p className="mb-6 text-sm text-text-secondary">
        Company profile, business settings, hours, branding, and subscription.
      </p>

      {isLoading ? (
        <div className="flex max-w-2xl flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-1/2" />
        </div>
      ) : isError || !organization ? (
        <p className="text-sm text-bad-fg">Couldn't load your organization. Please try again.</p>
      ) : (
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Company Profile</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="hours">Business Hours</TabsTrigger>
            <TabsTrigger value="logo">Logo</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <CompanyProfileTab organization={organization} />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab organization={organization} />
          </TabsContent>
          <TabsContent value="hours">
            <BusinessHoursTab organization={organization} />
          </TabsContent>
          <TabsContent value="logo">
            <LogoTab organization={organization} />
          </TabsContent>
          <TabsContent value="subscription">
            <SubscriptionTab organization={organization} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
