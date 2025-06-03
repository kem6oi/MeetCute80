--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5 (Ubuntu 17.5-1.pgdg24.04+1)
-- Dumped by pg_dump version 17.5 (Ubuntu 17.5-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: check_max_photos(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_max_photos() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF (
    SELECT COUNT(*) 
    FROM public.user_photos 
    WHERE user_id = NEW.user_id
  ) >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 photos allowed per user';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.check_max_photos() OWNER TO postgres;

--
-- Name: check_message_limits(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_message_limits() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    sender_tier VARCHAR;
    daily_limit INTEGER;
    daily_count INTEGER;
BEGIN
    -- Get sender's subscription tier
    SELECT sp.tier_level INTO sender_tier
    FROM user_subscriptions us
    JOIN subscription_packages sp ON us.package_id = sp.id
    WHERE us.user_id = NEW.sender_id AND us.status = 'active'
    ORDER BY sp.price DESC
    LIMIT 1;
    
    -- If no subscription or Basic tier, enforce limits
    IF sender_tier IS NULL OR sender_tier = 'Basic' THEN
        -- Get daily limit
        SELECT ml.daily_limit INTO daily_limit
        FROM message_limits ml
        WHERE ml.subscription_level = 'Basic';
        
        -- Count today's messages
        SELECT COUNT(*) INTO daily_count
        FROM messages
        WHERE sender_id = NEW.sender_id
          AND created_at >= CURRENT_DATE
          AND counted_for_limit = true;
          
        -- Check if over limit
        IF daily_count >= daily_limit THEN
            RAISE EXCEPTION 'Daily message limit reached for Basic tier subscription';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.check_message_limits() OWNER TO postgres;

--
-- Name: has_feature_access(integer, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.has_feature_access(user_id integer, feature_key character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $_$
DECLARE
    user_tier VARCHAR;
    has_access BOOLEAN;
BEGIN
    -- Get the user's subscription tier
    SELECT sp.tier_level INTO user_tier
    FROM user_subscriptions us
    JOIN subscription_packages sp ON us.package_id = sp.id
    WHERE us.user_id = $1 AND us.status = 'active'
    ORDER BY sp.price DESC
    LIMIT 1;
    
    -- If no subscription found, assume 'Basic'
    IF user_tier IS NULL THEN
        user_tier := 'Basic';
    END IF;
    
    -- Check if the user has access to this feature
    SELECT
        CASE
            WHEN user_tier = 'Elite' THEN fp.elite_access
            WHEN user_tier = 'Premium' THEN fp.premium_access
            ELSE fp.basic_access
        END INTO has_access
    FROM feature_permissions fp
    WHERE fp.feature_key = $2;
    
    RETURN COALESCE(has_access, FALSE);
END;
$_$;


ALTER FUNCTION public.has_feature_access(user_id integer, feature_key character varying) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_actions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_actions (
    id integer NOT NULL,
    admin_id integer,
    user_id integer,
    action_type character varying(50) NOT NULL,
    action_details text,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.admin_actions OWNER TO postgres;

--
-- Name: admin_actions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_actions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_actions_id_seq OWNER TO postgres;

--
-- Name: admin_actions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_actions_id_seq OWNED BY public.admin_actions.id;


--
-- Name: admin_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_logs (
    id integer NOT NULL,
    admin_id integer,
    action character varying(100) NOT NULL,
    target_user_id integer,
    details text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.admin_logs OWNER TO postgres;

--
-- Name: admin_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_logs_id_seq OWNER TO postgres;

--
-- Name: admin_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_logs_id_seq OWNED BY public.admin_logs.id;


--
-- Name: anonymous_browsing_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.anonymous_browsing_sessions (
    id integer NOT NULL,
    user_id integer,
    start_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    end_time timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.anonymous_browsing_sessions OWNER TO postgres;

--
-- Name: anonymous_browsing_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.anonymous_browsing_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.anonymous_browsing_sessions_id_seq OWNER TO postgres;

--
-- Name: anonymous_browsing_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.anonymous_browsing_sessions_id_seq OWNED BY public.anonymous_browsing_sessions.id;


--
-- Name: countries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.countries (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(2) NOT NULL,
    phone_code character varying(5) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.countries OWNER TO postgres;

--
-- Name: countries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.countries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.countries_id_seq OWNER TO postgres;

--
-- Name: countries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.countries_id_seq OWNED BY public.countries.id;


--
-- Name: country_payment_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.country_payment_methods (
    country_id integer NOT NULL,
    payment_method_id integer NOT NULL,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.country_payment_methods OWNER TO postgres;

--
-- Name: feature_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feature_permissions (
    id integer NOT NULL,
    feature_name character varying(100) NOT NULL,
    feature_key character varying(50) NOT NULL,
    basic_access boolean DEFAULT false,
    premium_access boolean DEFAULT false,
    elite_access boolean DEFAULT true,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.feature_permissions OWNER TO postgres;

--
-- Name: feature_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.feature_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.feature_permissions_id_seq OWNER TO postgres;

--
-- Name: feature_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.feature_permissions_id_seq OWNED BY public.feature_permissions.id;


--
-- Name: gift_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gift_items (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    image_url text,
    category character varying(50),
    is_available boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tier_id integer
);


ALTER TABLE public.gift_items OWNER TO postgres;

--
-- Name: gift_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.gift_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gift_items_id_seq OWNER TO postgres;

--
-- Name: gift_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.gift_items_id_seq OWNED BY public.gift_items.id;


--
-- Name: gift_tiers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gift_tiers (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    min_subscription_level character varying(20) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT gift_tiers_min_subscription_level_check CHECK (((min_subscription_level)::text = ANY ((ARRAY['Basic'::character varying, 'Premium'::character varying, 'Elite'::character varying])::text[])))
);


ALTER TABLE public.gift_tiers OWNER TO postgres;

--
-- Name: gift_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.gift_tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gift_tiers_id_seq OWNER TO postgres;

--
-- Name: gift_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.gift_tiers_id_seq OWNED BY public.gift_tiers.id;


--
-- Name: likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.likes (
    id integer NOT NULL,
    user_id integer,
    liked_user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.likes OWNER TO postgres;

--
-- Name: likes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.likes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.likes_id_seq OWNER TO postgres;

--
-- Name: likes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.likes_id_seq OWNED BY public.likes.id;


--
-- Name: likes_visibility; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.likes_visibility (
    user_id integer NOT NULL,
    can_see_likers boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.likes_visibility OWNER TO postgres;

--
-- Name: matches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.matches (
    id integer NOT NULL,
    user1_id integer,
    user2_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.matches OWNER TO postgres;

--
-- Name: matches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.matches_id_seq OWNER TO postgres;

--
-- Name: matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.matches_id_seq OWNED BY public.matches.id;


--
-- Name: message_limits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_limits (
    id integer NOT NULL,
    subscription_level character varying(20) NOT NULL,
    daily_limit integer NOT NULL,
    monthly_limit integer,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT message_limits_subscription_level_check CHECK (((subscription_level)::text = ANY ((ARRAY['Basic'::character varying, 'Premium'::character varying, 'Elite'::character varying])::text[])))
);


ALTER TABLE public.message_limits OWNER TO postgres;

--
-- Name: message_limits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.message_limits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.message_limits_id_seq OWNER TO postgres;

--
-- Name: message_limits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.message_limits_id_seq OWNED BY public.message_limits.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    sender_id integer,
    recipient_id integer,
    content text NOT NULL,
    read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    counted_for_limit boolean DEFAULT true,
    read_at timestamp with time zone
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_methods (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.payment_methods OWNER TO postgres;

--
-- Name: payment_methods_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_methods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_methods_id_seq OWNER TO postgres;

--
-- Name: payment_methods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_methods_id_seq OWNED BY public.payment_methods.id;


--
-- Name: profile_boosts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profile_boosts (
    id integer NOT NULL,
    user_id integer,
    boost_type character varying(50) NOT NULL,
    start_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    end_time timestamp with time zone,
    multiplier numeric(3,1) DEFAULT 1.5,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.profile_boosts OWNER TO postgres;

--
-- Name: profile_boosts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.profile_boosts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.profile_boosts_id_seq OWNER TO postgres;

--
-- Name: profile_boosts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.profile_boosts_id_seq OWNED BY public.profile_boosts.id;


--
-- Name: profile_views; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profile_views (
    id integer NOT NULL,
    viewer_id integer NOT NULL,
    viewed_user_id integer NOT NULL,
    viewed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    viewed_date date DEFAULT CURRENT_DATE
);


ALTER TABLE public.profile_views OWNER TO postgres;

--
-- Name: profile_views_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.profile_views_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.profile_views_id_seq OWNER TO postgres;

--
-- Name: profile_views_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.profile_views_id_seq OWNED BY public.profile_views.id;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    user_id integer NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    dob date NOT NULL,
    gender character varying(20) NOT NULL,
    bio text,
    profile_pic character varying(255),
    profile_picture character varying(255)
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: reported_content; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reported_content (
    id integer NOT NULL,
    reporter_id integer,
    reported_user_id integer,
    type character varying(50) NOT NULL,
    content_id integer,
    reason text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    reviewed_by integer,
    reviewed_at timestamp with time zone,
    CONSTRAINT reported_content_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'reviewed'::character varying, 'resolved'::character varying, 'dismissed'::character varying])::text[]))),
    CONSTRAINT reported_content_type_check CHECK (((type)::text = ANY ((ARRAY['profile'::character varying, 'photo'::character varying, 'message'::character varying, 'activity'::character varying])::text[])))
);


ALTER TABLE public.reported_content OWNER TO postgres;

--
-- Name: reported_content_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reported_content_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reported_content_id_seq OWNER TO postgres;

--
-- Name: reported_content_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reported_content_id_seq OWNED BY public.reported_content.id;


--
-- Name: subscription_features; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscription_features (
    id integer NOT NULL,
    package_id integer,
    feature_name character varying(200) NOT NULL,
    feature_description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    premium_only boolean DEFAULT false,
    elite_only boolean DEFAULT false
);


ALTER TABLE public.subscription_features OWNER TO postgres;

--
-- Name: subscription_features_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscription_features_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscription_features_id_seq OWNER TO postgres;

--
-- Name: subscription_features_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscription_features_id_seq OWNED BY public.subscription_features.id;


--
-- Name: subscription_packages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscription_packages (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    price numeric(10,2) NOT NULL,
    billing_interval character varying(20) DEFAULT 'monthly'::character varying NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    description text,
    duration_months integer DEFAULT 1,
    tier_level character varying(20),
    CONSTRAINT subscription_packages_tier_level_check CHECK (((tier_level)::text = ANY ((ARRAY['Basic'::character varying, 'Premium'::character varying, 'Elite'::character varying])::text[])))
);


ALTER TABLE public.subscription_packages OWNER TO postgres;

--
-- Name: subscription_packages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscription_packages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscription_packages_id_seq OWNER TO postgres;

--
-- Name: subscription_packages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscription_packages_id_seq OWNED BY public.subscription_packages.id;


--
-- Name: subscription_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscription_transactions (
    id integer NOT NULL,
    subscription_id integer,
    amount numeric(10,2) NOT NULL,
    status character varying(50) DEFAULT 'completed'::character varying NOT NULL,
    payment_method character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.subscription_transactions OWNER TO postgres;

--
-- Name: subscription_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscription_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscription_transactions_id_seq OWNER TO postgres;

--
-- Name: subscription_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscription_transactions_id_seq OWNED BY public.subscription_transactions.id;


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tickets (
    id integer NOT NULL,
    user_id integer,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying,
    assigned_to integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tickets OWNER TO postgres;

--
-- Name: tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tickets_id_seq OWNER TO postgres;

--
-- Name: tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tickets_id_seq OWNED BY public.tickets.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    user_id integer,
    type character varying(50) NOT NULL,
    amount numeric(10,2) NOT NULL,
    status character varying(50) DEFAULT 'completed'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT transactions_type_check CHECK (((type)::text = ANY ((ARRAY['subscription'::character varying, 'gift'::character varying])::text[])))
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: user_gifts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_gifts (
    id integer NOT NULL,
    sender_id integer,
    recipient_id integer,
    gift_item_id integer,
    message text,
    is_anonymous boolean DEFAULT false,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_gifts OWNER TO postgres;

--
-- Name: user_gifts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_gifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_gifts_id_seq OWNER TO postgres;

--
-- Name: user_gifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_gifts_id_seq OWNED BY public.user_gifts.id;


--
-- Name: user_photos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_photos (
    id integer NOT NULL,
    user_id integer,
    photo_url text NOT NULL,
    is_profile_picture boolean DEFAULT false,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_photos OWNER TO postgres;

--
-- Name: user_photos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_photos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_photos_id_seq OWNER TO postgres;

--
-- Name: user_photos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_photos_id_seq OWNED BY public.user_photos.id;


--
-- Name: user_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_subscriptions (
    id integer NOT NULL,
    user_id integer,
    package_id integer,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    start_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    end_date timestamp with time zone NOT NULL,
    auto_renew boolean DEFAULT true,
    payment_method_id character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_subscriptions_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'cancelled'::character varying, 'expired'::character varying])::text[])))
);


ALTER TABLE public.user_subscriptions OWNER TO postgres;

--
-- Name: user_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_subscriptions_id_seq OWNER TO postgres;

--
-- Name: user_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_subscriptions_id_seq OWNED BY public.user_subscriptions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'user'::character varying,
    is_active boolean DEFAULT true,
    profile_complete boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_suspended boolean DEFAULT false,
    suspension_reason text,
    suspension_end_date timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now(),
    suspended_at timestamp with time zone,
    country_id integer,
    phone character varying(20),
    phone_verified boolean DEFAULT false,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'staff'::character varying, 'admin'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: admin_actions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_actions ALTER COLUMN id SET DEFAULT nextval('public.admin_actions_id_seq'::regclass);


--
-- Name: admin_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_logs ALTER COLUMN id SET DEFAULT nextval('public.admin_logs_id_seq'::regclass);


--
-- Name: anonymous_browsing_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anonymous_browsing_sessions ALTER COLUMN id SET DEFAULT nextval('public.anonymous_browsing_sessions_id_seq'::regclass);


--
-- Name: countries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.countries ALTER COLUMN id SET DEFAULT nextval('public.countries_id_seq'::regclass);


--
-- Name: feature_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feature_permissions ALTER COLUMN id SET DEFAULT nextval('public.feature_permissions_id_seq'::regclass);


--
-- Name: gift_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gift_items ALTER COLUMN id SET DEFAULT nextval('public.gift_items_id_seq'::regclass);


--
-- Name: gift_tiers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gift_tiers ALTER COLUMN id SET DEFAULT nextval('public.gift_tiers_id_seq'::regclass);


--
-- Name: likes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.likes ALTER COLUMN id SET DEFAULT nextval('public.likes_id_seq'::regclass);


--
-- Name: matches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches ALTER COLUMN id SET DEFAULT nextval('public.matches_id_seq'::regclass);


--
-- Name: message_limits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_limits ALTER COLUMN id SET DEFAULT nextval('public.message_limits_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: payment_methods id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_methods ALTER COLUMN id SET DEFAULT nextval('public.payment_methods_id_seq'::regclass);


--
-- Name: profile_boosts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_boosts ALTER COLUMN id SET DEFAULT nextval('public.profile_boosts_id_seq'::regclass);


--
-- Name: profile_views id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_views ALTER COLUMN id SET DEFAULT nextval('public.profile_views_id_seq'::regclass);


--
-- Name: reported_content id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reported_content ALTER COLUMN id SET DEFAULT nextval('public.reported_content_id_seq'::regclass);


--
-- Name: subscription_features id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_features ALTER COLUMN id SET DEFAULT nextval('public.subscription_features_id_seq'::regclass);


--
-- Name: subscription_packages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_packages ALTER COLUMN id SET DEFAULT nextval('public.subscription_packages_id_seq'::regclass);


--
-- Name: subscription_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_transactions ALTER COLUMN id SET DEFAULT nextval('public.subscription_transactions_id_seq'::regclass);


--
-- Name: tickets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets ALTER COLUMN id SET DEFAULT nextval('public.tickets_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: user_gifts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_gifts ALTER COLUMN id SET DEFAULT nextval('public.user_gifts_id_seq'::regclass);


--
-- Name: user_photos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_photos ALTER COLUMN id SET DEFAULT nextval('public.user_photos_id_seq'::regclass);


--
-- Name: user_subscriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.user_subscriptions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: admin_actions admin_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_pkey PRIMARY KEY (id);


--
-- Name: admin_logs admin_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_pkey PRIMARY KEY (id);


--
-- Name: anonymous_browsing_sessions anonymous_browsing_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anonymous_browsing_sessions
    ADD CONSTRAINT anonymous_browsing_sessions_pkey PRIMARY KEY (id);


--
-- Name: countries countries_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_code_key UNIQUE (code);


--
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);


--
-- Name: country_payment_methods country_payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.country_payment_methods
    ADD CONSTRAINT country_payment_methods_pkey PRIMARY KEY (country_id, payment_method_id);


--
-- Name: feature_permissions feature_permissions_feature_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feature_permissions
    ADD CONSTRAINT feature_permissions_feature_key_key UNIQUE (feature_key);


--
-- Name: feature_permissions feature_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feature_permissions
    ADD CONSTRAINT feature_permissions_pkey PRIMARY KEY (id);


--
-- Name: gift_items gift_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gift_items
    ADD CONSTRAINT gift_items_pkey PRIMARY KEY (id);


--
-- Name: gift_tiers gift_tiers_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gift_tiers
    ADD CONSTRAINT gift_tiers_name_key UNIQUE (name);


--
-- Name: gift_tiers gift_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gift_tiers
    ADD CONSTRAINT gift_tiers_pkey PRIMARY KEY (id);


--
-- Name: likes likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_pkey PRIMARY KEY (id);


--
-- Name: likes likes_user_id_liked_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_user_id_liked_user_id_key UNIQUE (user_id, liked_user_id);


--
-- Name: likes_visibility likes_visibility_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.likes_visibility
    ADD CONSTRAINT likes_visibility_pkey PRIMARY KEY (user_id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: matches matches_user1_id_user2_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_user1_id_user2_id_key UNIQUE (user1_id, user2_id);


--
-- Name: message_limits message_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_limits
    ADD CONSTRAINT message_limits_pkey PRIMARY KEY (id);


--
-- Name: message_limits message_limits_subscription_level_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_limits
    ADD CONSTRAINT message_limits_subscription_level_key UNIQUE (subscription_level);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_code_key UNIQUE (code);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- Name: profile_boosts profile_boosts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_boosts
    ADD CONSTRAINT profile_boosts_pkey PRIMARY KEY (id);


--
-- Name: profile_views profile_views_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_views
    ADD CONSTRAINT profile_views_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (user_id);


--
-- Name: reported_content reported_content_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reported_content
    ADD CONSTRAINT reported_content_pkey PRIMARY KEY (id);


--
-- Name: subscription_features subscription_features_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_features
    ADD CONSTRAINT subscription_features_pkey PRIMARY KEY (id);


--
-- Name: subscription_packages subscription_packages_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_packages
    ADD CONSTRAINT subscription_packages_name_key UNIQUE (name);


--
-- Name: subscription_packages subscription_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_packages
    ADD CONSTRAINT subscription_packages_pkey PRIMARY KEY (id);


--
-- Name: subscription_transactions subscription_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_transactions
    ADD CONSTRAINT subscription_transactions_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: profile_views unique_view_per_day; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_views
    ADD CONSTRAINT unique_view_per_day UNIQUE (viewer_id, viewed_user_id, viewed_date);


--
-- Name: user_gifts user_gifts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_gifts
    ADD CONSTRAINT user_gifts_pkey PRIMARY KEY (id);


--
-- Name: user_photos user_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_photos
    ADD CONSTRAINT user_photos_pkey PRIMARY KEY (id);


--
-- Name: user_subscriptions user_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_admin_logs_admin_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_logs_admin_id ON public.admin_logs USING btree (admin_id);


--
-- Name: idx_admin_logs_target_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_logs_target_user_id ON public.admin_logs USING btree (target_user_id);


--
-- Name: idx_countries_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_countries_code ON public.countries USING btree (code);


--
-- Name: idx_country_payment_methods_country; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_country_payment_methods_country ON public.country_payment_methods USING btree (country_id);


--
-- Name: idx_country_payment_methods_payment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_country_payment_methods_payment ON public.country_payment_methods USING btree (payment_method_id);


--
-- Name: idx_likes_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_likes_created_at ON public.likes USING btree (created_at);


--
-- Name: idx_likes_liked_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_likes_liked_user_id ON public.likes USING btree (liked_user_id);


--
-- Name: idx_likes_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_likes_user_id ON public.likes USING btree (user_id);


--
-- Name: idx_matches_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_matches_created_at ON public.matches USING btree (created_at);


--
-- Name: idx_matches_user1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_matches_user1 ON public.matches USING btree (user1_id);


--
-- Name: idx_matches_user1_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_matches_user1_id ON public.matches USING btree (user1_id);


--
-- Name: idx_matches_user2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_matches_user2 ON public.matches USING btree (user2_id);


--
-- Name: idx_matches_user2_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_matches_user2_id ON public.matches USING btree (user2_id);


--
-- Name: idx_payment_methods_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_methods_code ON public.payment_methods USING btree (code);


--
-- Name: idx_profile_views_viewed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profile_views_viewed_at ON public.profile_views USING btree (viewed_at);


--
-- Name: idx_profile_views_viewer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profile_views_viewer_id ON public.profile_views USING btree (viewer_id);


--
-- Name: idx_profiles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id);


--
-- Name: idx_reported_content_reported_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reported_content_reported_user ON public.reported_content USING btree (reported_user_id);


--
-- Name: idx_reported_content_reporter; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reported_content_reporter ON public.reported_content USING btree (reporter_id);


--
-- Name: idx_reported_content_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reported_content_status ON public.reported_content USING btree (status);


--
-- Name: idx_reported_content_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reported_content_type ON public.reported_content USING btree (type);


--
-- Name: idx_subscription_features_package; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subscription_features_package ON public.subscription_features USING btree (package_id);


--
-- Name: idx_subscription_packages_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subscription_packages_active ON public.subscription_packages USING btree (is_active);


--
-- Name: idx_subscription_transactions_subscription; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subscription_transactions_subscription ON public.subscription_transactions USING btree (subscription_id);


--
-- Name: idx_transactions_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_created_at ON public.transactions USING btree (created_at);


--
-- Name: idx_transactions_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_type ON public.transactions USING btree (type);


--
-- Name: idx_transactions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_user_id ON public.transactions USING btree (user_id);


--
-- Name: idx_user_photos_profile_picture; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_user_photos_profile_picture ON public.user_photos USING btree (user_id) WHERE (is_profile_picture = true);


--
-- Name: idx_user_photos_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_photos_user_id ON public.user_photos USING btree (user_id);


--
-- Name: idx_user_subscriptions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions USING btree (status);


--
-- Name: idx_user_subscriptions_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_subscriptions_user ON public.user_subscriptions USING btree (user_id);


--
-- Name: idx_users_is_suspended; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_is_suspended ON public.users USING btree (is_suspended);


--
-- Name: user_photos enforce_max_photos; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER enforce_max_photos BEFORE INSERT ON public.user_photos FOR EACH ROW EXECUTE FUNCTION public.check_max_photos();


--
-- Name: messages message_limit_check; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER message_limit_check BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.check_message_limits();


--
-- Name: admin_actions admin_actions_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id);


--
-- Name: admin_actions admin_actions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: admin_logs admin_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: admin_logs admin_logs_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: anonymous_browsing_sessions anonymous_browsing_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anonymous_browsing_sessions
    ADD CONSTRAINT anonymous_browsing_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: country_payment_methods country_payment_methods_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.country_payment_methods
    ADD CONSTRAINT country_payment_methods_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE CASCADE;


--
-- Name: country_payment_methods country_payment_methods_payment_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.country_payment_methods
    ADD CONSTRAINT country_payment_methods_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) ON DELETE CASCADE;


--
-- Name: gift_items gift_items_tier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gift_items
    ADD CONSTRAINT gift_items_tier_id_fkey FOREIGN KEY (tier_id) REFERENCES public.gift_tiers(id);


--
-- Name: likes likes_liked_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_liked_user_id_fkey FOREIGN KEY (liked_user_id) REFERENCES public.users(id);


--
-- Name: likes likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: likes_visibility likes_visibility_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.likes_visibility
    ADD CONSTRAINT likes_visibility_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: matches matches_user1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES public.users(id);


--
-- Name: matches matches_user2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES public.users(id);


--
-- Name: messages messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id);


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: profile_boosts profile_boosts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_boosts
    ADD CONSTRAINT profile_boosts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: profile_views profile_views_viewed_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_views
    ADD CONSTRAINT profile_views_viewed_user_id_fkey FOREIGN KEY (viewed_user_id) REFERENCES public.users(id);


--
-- Name: profile_views profile_views_viewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_views
    ADD CONSTRAINT profile_views_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES public.users(id);


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reported_content reported_content_reported_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reported_content
    ADD CONSTRAINT reported_content_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reported_content reported_content_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reported_content
    ADD CONSTRAINT reported_content_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reported_content reported_content_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reported_content
    ADD CONSTRAINT reported_content_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: subscription_features subscription_features_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_features
    ADD CONSTRAINT subscription_features_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.subscription_packages(id) ON DELETE CASCADE;


--
-- Name: subscription_transactions subscription_transactions_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_transactions
    ADD CONSTRAINT subscription_transactions_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.user_subscriptions(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: tickets tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_gifts user_gifts_gift_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_gifts
    ADD CONSTRAINT user_gifts_gift_item_id_fkey FOREIGN KEY (gift_item_id) REFERENCES public.gift_items(id);


--
-- Name: user_gifts user_gifts_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_gifts
    ADD CONSTRAINT user_gifts_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id);


--
-- Name: user_gifts user_gifts_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_gifts
    ADD CONSTRAINT user_gifts_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: user_photos user_photos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_photos
    ADD CONSTRAINT user_photos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_subscriptions user_subscriptions_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.subscription_packages(id) ON DELETE RESTRICT;


--
-- Name: user_subscriptions user_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO postgres;


--
-- Name: TABLE admin_actions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_actions TO wiseman;


--
-- Name: SEQUENCE admin_actions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.admin_actions_id_seq TO wiseman;


--
-- Name: TABLE admin_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_logs TO wiseman;


--
-- Name: SEQUENCE admin_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.admin_logs_id_seq TO wiseman;


--
-- Name: TABLE gift_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.gift_items TO wiseman;


--
-- Name: SEQUENCE gift_items_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.gift_items_id_seq TO wiseman;


--
-- Name: TABLE likes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.likes TO wiseman;


--
-- Name: SEQUENCE likes_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.likes_id_seq TO wiseman;


--
-- Name: TABLE matches; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.matches TO wiseman;


--
-- Name: SEQUENCE matches_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.matches_id_seq TO wiseman;


--
-- Name: TABLE messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.messages TO wiseman;


--
-- Name: SEQUENCE messages_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.messages_id_seq TO wiseman;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO wiseman;


--
-- Name: TABLE reported_content; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.reported_content TO wiseman;


--
-- Name: SEQUENCE reported_content_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.reported_content_id_seq TO wiseman;


--
-- Name: TABLE tickets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tickets TO wiseman;


--
-- Name: SEQUENCE tickets_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.tickets_id_seq TO wiseman;


--
-- Name: TABLE transactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.transactions TO wiseman;


--
-- Name: SEQUENCE transactions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.transactions_id_seq TO wiseman;


--
-- Name: TABLE user_gifts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_gifts TO wiseman;


--
-- Name: SEQUENCE user_gifts_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.user_gifts_id_seq TO wiseman;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO wiseman;


--
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.users_id_seq TO wiseman;


--
-- PostgreSQL database dump complete
--


