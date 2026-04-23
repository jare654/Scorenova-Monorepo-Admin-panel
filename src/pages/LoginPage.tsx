import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useAuth } from "../components/auth/context/AuthContext";
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

type FormValues = {
  phoneNumber: string;
  password: string;
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      phoneNumber: "251",
      password: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);

    const success = await login(values.phoneNumber, values.password);

    setLoading(false);

    if (!success) {
      toast({
        title: "Login Failed",
        description: "Incorrect phone number or password",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Welcome",
      description: "Login successful",
    });

    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted px-4">
      <div className="w-full max-w-md bg-card border rounded-2xl shadow-xl p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shadow-inner">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Admin Panel</h2>
          <p className="text-sm text-muted-foreground">
            Super Admin Access Only
          </p>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Phone */}
            <FormField
              control={form.control}
              name="phoneNumber"
              rules={{
                required: "Phone number is required",
                validate: (value) => {
                  const digitsAfterPrefix = value.slice(3); // remove "251"
                  if (digitsAfterPrefix.length !== 9)
                    return "Phone number must be exactly 9 digits after 251";
                  return true;
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input
                        type="tel"
                        inputMode="numeric"
                        placeholder="Enter phone number"
                        className="pl-9 h-11"
                        {...field}
                        disabled={loading}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const digits = raw.replace(/\D/g, "");

                          const withoutPrefix = digits.startsWith("251")
                            ? digits.slice(3)
                            : digits;

                          // Cap at 9 digits after the prefix
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

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              rules={{
                required: "Password is required",
                maxLength: {
                  value: 25,
                  message: "Password cannot exceed 25 characters",
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        className="pl-9 pr-10 h-11"
                        {...field}
                        disabled={loading}
                        maxLength={25}
                      />
                    </FormControl>

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-sm font-semibold rounded-lg transition-all duration-300
              hover:scale-[1.02] hover:shadow-lg flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </Form>

        <div className="text-center text-xs text-muted-foreground">
          Secure access • Admin only
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
