import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, MapPin, ChevronLeft, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { apiClient } from "@/services/api/client";
import { useAuth } from "@/components/auth/context/AuthContext";

type FormValues = {
  name: string;
  email: string;
  phoneNumber: string;
  gender: string;
  address: string;
};

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "251",
      gender: "",
      address: "",
    },
  });

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const data = await apiClient.get<any>("/auth/get-user-info");

        form.reset({
          name: data.name ?? "",
          email: data.email ?? "",
          phoneNumber: data.phoneNumber ?? "251",
          gender: data.gender ?? "",
          address: data.address ?? "",
        });
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to load profile information",
          variant: "destructive",
        });
      } finally {
        setFetching(false);
      }
    };

    fetchUserInfo();
  }, []);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const cleanDigits = values.phoneNumber.replace(/\D/g, "");
      const normalizedPhone = cleanDigits.startsWith("251") ? cleanDigits.slice(3) : cleanDigits;

      const data = await apiClient.post<any>("/accounts/update-profile", {
        name: values.name.trim(),
        email: values.email.trim(),
        phoneNumber: normalizedPhone,
        gender: values.gender,
        address: values.address?.trim() || undefined,
        isActive: true,
      });

      // Update global auth context
      updateUser({
        name: data?.name || values.name.trim(),
        email: data?.email || values.email.trim(),
      });

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
      });
      navigate("/admin-profile");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin-profile")}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Profile</h1>
          <p className="text-sm text-muted-foreground">
            Update your personal information
          </p>
        </div>
      </div>

      {/* Avatar placeholder */}
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
          <User className="h-10 w-10 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">Profile Photo</p>
          <p className="text-xs text-muted-foreground">
            Photo upload not available yet
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Edit your account details below</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                rules={{ required: "Name is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Input
                          placeholder="Enter full name"
                          className="pl-9 h-11"
                          disabled={loading}
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                rules={{
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email address",
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter email address"
                          className="pl-9 h-11"
                          disabled={loading}
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone Number */}
              <FormField
                control={form.control}
                name="phoneNumber"
                rules={{
                  required: "Phone number is required",
                  validate: (value) => {
                    const digitsAfterPrefix = value.slice(3);
                    if (digitsAfterPrefix.length !== 9)
                      return "Phone number must be exactly 9 digits after 251";
                    return true;
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Input
                          type="tel"
                          inputMode="numeric"
                          placeholder="251XXXXXXXXX"
                          className="pl-9 h-11"
                          disabled={loading}
                          {...field}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const digits = raw.replace(/\D/g, "");
                            const withoutPrefix = digits.startsWith("251")
                              ? digits.slice(3)
                              : digits;
                            const capped = withoutPrefix.slice(0, 9);
                            field.onChange("251" + capped);
                          }}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Gender */}
              <FormField
                control={form.control}
                name="gender"
                rules={{ required: "Gender is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={loading}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Address */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Address{" "}
                      <span className="text-muted-foreground font-normal text-xs">
                        (optional)
                      </span>
                    </FormLabel>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Input
                          placeholder="Enter address"
                          className="pl-9 h-11"
                          disabled={loading}
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-11"
                  onClick={() => navigate("/admin-profile")}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-11 font-semibold"
                  disabled={loading}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditProfilePage;
